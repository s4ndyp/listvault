# ListVault Pro

Themeable **PWA** voor lijsten, favorieten en tags. **Vue 3** + **PocketBase** (server) met **Dexie**-cache en outbox voor offline werken.

## Stack

| Onderdeel | Rol |
|-----------|-----|
| **PocketBase 0.40** | API + opslag (`data_lists` collectie) |
| **pb_public/** | Static UI (zelfde origin als `/api`) |
| **Dexie** | Lokale cache + sync-outbox |

## Lokaal / Docker

```bash
docker compose pull
docker compose up -d
```

Open [http://localhost:8099](http://localhost:8099). PocketBase-admin: [http://localhost:8099/_/](http://localhost:8099/_/)

Eerste superuser (optioneel):

```bash
docker compose exec app /pb/pocketbase superuser upsert admin@example.com 'kies-een-wachtwoord'
```

Image: `ghcr.io/s4ndyp/listvault:latest` (GitHub Actions op `main` / `beta`). Privé-package: `docker login ghcr.io`.

Zelf builden:

```bash
docker build -t listvault:local .
docker run --rm -p 8099:8080 -v listvault_data:/pb/pb_data listvault:local
```

Data blijft in Docker-volume `listvault_data`.

## Deploy op Proxmox (LXC + Docker)

Uitrol via [scripts/listvault/listvault.sh](scripts/listvault/listvault.sh) (Xdio / [s4ndyp/scripts](https://github.com/s4ndyp/scripts) helpers).

Op de **Proxmox host** als root:

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/s4ndyp/listvault/HEAD/scripts/listvault/listvault.sh)"
```

Standaard: **1 CPU**, **1 GB RAM**, **4 GB disk**; app op **poort 80** in de LXC (`http://<IP>/`).

| Variabele | Default | Beschrijving |
|-----------|---------|--------------|
| `GHCR_TOKEN` | — | Pull van privé GHCR-package |
| `LISTVAULT_PORT` | `80` | Host-poort in de LXC |
| `LISTVAULT_COMPOSE_URL` | `HEAD/docker-compose.yml` | Ander compose-bestand |

**Update** in de container: `update`, of:

```bash
cd /opt/listvault && docker compose pull && docker compose up -d
```

## PWA

1. Open de app via HTTPS of localhost.
2. **Toevoegen aan startscherm** / **Installeren**.
3. Offline: wijzigingen in Dexie; sync bij verbinding naar PocketBase.

## Beveiliging

Collectie-regels zijn **open** (zelfde model als Tinynote/TrackNote): bedoeld voor persoonlijke instances op een vertrouwd netwerk. Gebruik een reverse proxy met auth als de service bereikbaar is vanaf internet.

Migrations staan in `pb_migrations/`; schema: `data_lists` met o.a. `name`, `tags`, `columns`, `rows` (JSON).
