# ListVault Pro

Themeable **PWA** voor lijsten, favorieten en tags — volledig client-side (Vue 3 + IndexedDB via Dexie). Werkt offline via service worker.

## Lokaal / Docker

```bash
docker compose pull
docker compose up -d
```

Open [http://localhost:8099](http://localhost:8099) (standaard mapping in `docker-compose.yml`). Pas de host-poort aan in `docker-compose.yml` of zet `LISTVAULT_PORT` bij Proxmox-installatie.

Image: `ghcr.io/s4ndyp/listvault:latest` (gebouwd via GitHub Actions op `main` / `beta`). Bij een privé-package: `docker login ghcr.io`.

Zelf builden:

```bash
docker build -t listvault:local .
docker run --rm -p 8080:80 listvault:local
```

## Deploy op Proxmox (LXC + Docker)

Uitrol via het **installatiescript in deze repo** (Xdio / [community-scripts](https://github.com/community-scripts/ProxmoxVE)-stijl). Gedeelde helpers komen uit [s4ndyp/scripts](https://github.com/s4ndyp/scripts).

Op de **Proxmox host** als root:

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/s4ndyp/listvault/HEAD/scripts/listvault/listvault.sh)"
```

(`HEAD` = default branch van deze repo; geen vaste branchnaam in het pad.)

- Installatiescript: [scripts/listvault/listvault.sh](scripts/listvault/listvault.sh)
- LXC-install: [scripts/install/listvault-install.sh](scripts/install/listvault-install.sh)

Standaard: **1 CPU**, **1 GB RAM**, **4 GB disk**; app op **poort 80** in de LXC (`http://<IP>/`).

Optioneel vóór install op de host:

| Variabele | Default | Beschrijving |
|-----------|---------|--------------|
| `GHCR_TOKEN` | — | Pull van privé GHCR-package |
| `LISTVAULT_PORT` | `80` | Host-poort in de LXC |
| `LISTVAULT_COMPOSE_URL` | `HEAD/docker-compose.yml` op GitHub | Ander compose-bestand |

**Update** in de container: `update`, of handmatig:

```bash
cd /opt/listvault && docker compose pull && docker compose up -d
```

## PWA installeren

1. Open de app in Chrome/Safari (HTTPS of localhost).
2. **Toevoegen aan startscherm** / **Installeren**.
3. Data blijft in de browser op dat apparaat.

## Beveiliging

Geen server-side login. Gebruik alleen op een vertrouwd netwerk of achter een reverse proxy met authenticatie als de instance bereikbaar is vanaf het internet.
