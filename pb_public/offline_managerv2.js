/**
 * OfflineManager + PocketBase REST gateway (Dexie cache + outbox).
 */

class DataGateway {
    constructor(baseUrl, clientId) {
        this.baseUrl = (baseUrl || '').replace(/\/$/, '');
        this.clientId = clientId;
    }

    _recordsUrl(collectionName, id = null) {
        let url = `${this.baseUrl}/api/collections/${collectionName}/records`;
        if (id) url += `/${encodeURIComponent(id)}`;
        return url;
    }

    _headers(json = true) {
        const h = { 'x-client-id': this.clientId };
        if (json) h['Content-Type'] = 'application/json';
        return h;
    }

    _docFromPb(record) {
        return {
            _id: record.id,
            name: record.name,
            tags: record.tags ?? [],
            columns: record.columns ?? [],
            columnSettings: record.columnSettings ?? {},
            hiddenColumns: record.hiddenColumns ?? [],
            rows: record.rows ?? [],
            isFavorite: !!record.isFavorite,
        };
    }

    _docToPb(data) {
        return {
            name: data.name ?? 'Naamloos',
            tags: data.tags ?? [],
            columns: data.columns ?? [],
            columnSettings: data.columnSettings ?? {},
            hiddenColumns: data.hiddenColumns ?? [],
            rows: data.rows ?? [],
            isFavorite: !!data.isFavorite,
        };
    }

    async getCollection(name) {
        const all = [];
        let page = 1;
        let totalPages = 1;

        do {
            const q = new URLSearchParams({
                page: String(page),
                perPage: '500',
                sort: '-updated',
            });
            const response = await fetch(`${this._recordsUrl(name)}?${q}`, {
                headers: this._headers(false),
            });
            if (!response.ok) throw new Error(`Server error: ${response.status}`);
            const data = await response.json();
            for (const item of data.items || []) {
                all.push(this._docFromPb(item));
            }
            totalPages = data.totalPages || 1;
            page += 1;
        } while (page <= totalPages);

        return all;
    }

    async saveDocument(name, data) {
        const body = this._docToPb(data);
        const id = data._id;
        const url = id ? this._recordsUrl(name, id) : this._recordsUrl(name);
        const method = id ? 'PATCH' : 'POST';
        const response = await fetch(url, {
            method,
            headers: this._headers(true),
            body: JSON.stringify(body),
        });
        if (!response.ok) throw new Error(`Save error: ${response.status}`);
        const record = await response.json();
        return this._docFromPb(record);
    }

    async deleteDocument(name, id) {
        const response = await fetch(this._recordsUrl(name, id), {
            method: 'DELETE',
            headers: this._headers(false),
        });
        if (!response.ok) throw new Error(`Delete error: ${response.status}`);
        return null;
    }
}

class OfflineManager {
    constructor(baseUrl, clientId, appName) {
        this.appName = appName;
        this.gateway = new DataGateway(baseUrl, clientId);
        this.db = new Dexie(`OfflineEngine_${appName}_${clientId}`);

        this.db.version(1).stores({
            data: '++id, collection, _id',
            outbox: '++id, action, collection',
        });

        this.isSyncing = false;
        this.onSyncChange = null;
        this.onDataChanged = null;
        this.isOfflineSimulated = false;
    }

    async saveSmartDocument(collectionName, data) {
        const record = JSON.parse(JSON.stringify(data));

        if (record.id) {
            const latest = await this.db.data.get(Number(record.id));
            if (latest && latest._id) record._id = latest._id;
        }

        const localRecord = { ...record, collection: collectionName };
        if (record.id) {
            localRecord.id = Number(record.id);
        } else if (record._id) {
            const existing = await this.db.data
                .where({ collection: collectionName, _id: record._id })
                .first();
            if (existing) localRecord.id = existing.id;
        }

        const savedId = await this.db.data.put(localRecord);
        localRecord.id = savedId;

        const action = localRecord._id ? 'PATCH' : 'POST';
        const pending = await this.db.outbox
            .where({ collection: collectionName })
            .filter((o) => o.payload.id === savedId)
            .first();

        if (pending) {
            await this.db.outbox.update(pending.id, { action, payload: localRecord });
        } else {
            await this.db.outbox.add({ action, collection: collectionName, payload: localRecord });
        }

        if (navigator.onLine && !this.isOfflineSimulated) this.syncOutbox();
        return localRecord;
    }

    async deleteSmartDocument(collectionName, id) {
        const item = await this.db.data
            .where({ collection: collectionName })
            .filter((i) => String(i._id || i.id) === String(id))
            .first();

        const serverId = item ? item._id : String(id).length > 10 ? id : null;

        await this.db.data
            .where({ collection: collectionName })
            .filter((i) => String(i._id || i.id) === String(id))
            .delete();

        if (serverId) {
            await this.db.outbox.add({
                action: 'DELETE',
                collection: collectionName,
                payload: { _id: serverId },
            });
        } else {
            await this.db.outbox
                .where({ collection: collectionName })
                .filter((o) => String(o.payload.id) === String(id))
                .delete();
        }

        if (navigator.onLine && !this.isOfflineSimulated) this.syncOutbox();
    }

    async getSmartCollection(collectionName) {
        return await this.db.data.where({ collection: collectionName }).toArray();
    }

    async refreshCache(collectionName) {
        if (!navigator.onLine || this.isOfflineSimulated) return;

        try {
            const freshData = await this.gateway.getCollection(collectionName);
            const outboxItems = await this.db.outbox.where({ collection: collectionName }).toArray();

            const deletedIds = new Set(
                outboxItems.filter((i) => i.action === 'DELETE').map((i) => i.payload._id)
            );
            const pendingLocalIds = new Set(
                outboxItems
                    .filter((i) => i.action !== 'DELETE')
                    .map((i) => i.payload.id)
            );
            const pendingServerIds = new Set(
                outboxItems
                    .filter((i) => i.action !== 'DELETE' && i.payload._id)
                    .map((i) => i.payload._id)
            );

            const filteredServerData = freshData.filter((doc) => !deletedIds.has(doc._id));

            const localItems = await this.db.data.where({ collection: collectionName }).toArray();
            const idMap = new Map();
            localItems.forEach((item) => {
                if (item._id) idMap.set(item._id, item.id);
            });

            const taggedData = filteredServerData.map((d) => {
                const item = { ...d, collection: collectionName };
                if (idMap.has(d._id)) item.id = idMap.get(d._id);
                return item;
            });

            const serverIds = new Set(filteredServerData.map((d) => d._id));
            await this.db.data
                .where({ collection: collectionName })
                .filter((doc) => {
                    if (pendingLocalIds.has(doc.id)) return false;
                    if (doc._id) {
                        return !serverIds.has(doc._id) && !pendingServerIds.has(doc._id);
                    }
                    return !pendingLocalIds.has(doc.id);
                })
                .delete();

            await this.db.data.bulkPut(taggedData);

            if (this.onDataChanged) this.onDataChanged(collectionName);
        } catch (err) {
            console.warn('[Manager] Refresh overgeslagen of mislukt', err);
        }
    }

    async syncOutbox() {
        if (!navigator.onLine || this.isOfflineSimulated || this.isSyncing) return;
        this.isSyncing = true;

        try {
            let items = await this.db.outbox.orderBy('id').toArray();
            if (this.onSyncChange) this.onSyncChange(items.length);

            while (items.length > 0 && !this.isOfflineSimulated) {
                const item = items[0];
                try {
                    if (item.action === 'DELETE') {
                        await this.gateway.deleteDocument(item.collection, item.payload._id);
                    } else {
                        const payload = { ...item.payload };
                        const dexieId = payload.id;
                        delete payload.id;
                        delete payload.collection;

                        const response = await this.gateway.saveDocument(item.collection, payload);
                        if ((item.action === 'POST' || item.action === 'PATCH') && response && response._id) {
                            await this.db.data.update(dexieId, { _id: response._id });
                        }
                    }
                    await this.db.outbox.delete(item.id);
                } catch (e) {
                    break;
                }
                items = await this.db.outbox.orderBy('id').toArray();
                if (this.onSyncChange) this.onSyncChange(items.length);
            }
        } finally {
            this.isSyncing = false;
            if (this.onDataChanged) this.onDataChanged();
        }
    }
}
