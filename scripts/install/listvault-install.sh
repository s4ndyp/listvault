#!/usr/bin/env bash

source /dev/stdin <<<"$FUNCTIONS_FILE_PATH"
color
verb_ip6
catch_errors
setting_up_container
network_check
update_os

# shellcheck source=/dev/null
source <(curl -fsSL "${XDIO_SCRIPTS_LIB_URL:-https://raw.githubusercontent.com/s4ndyp/scripts/main}/lib/xdio-compose-install.sh")

APP_DIR="/opt/listvault"
COMPOSE_URL="${LISTVAULT_COMPOSE_URL:-https://raw.githubusercontent.com/s4ndyp/listvault/HEAD/docker-compose.yml}"
HOST_PORT="${LISTVAULT_PORT:-80}"

setup_docker
xdio_ghcr_login

msg_info "Preparing ListVault stack"
mkdir -p "${APP_DIR}"
curl -fsSL "${COMPOSE_URL}" -o "${APP_DIR}/docker-compose.yml"
# Oude installs: 8099:80 of 8099:8080 — app luistert weer op :80 in de container
sed -i -E \
  -e "s/\"8099:8080\"/\"${HOST_PORT}:80\"/" \
  -e "s/\"8099:80\"/\"${HOST_PORT}:80\"/" \
  "${APP_DIR}/docker-compose.yml"
msg_ok "Prepared ListVault stack"

msg_info "Pulling ListVault image"
cd "${APP_DIR}"
if ! $STD docker compose pull; then
  msg_error "Could not pull GHCR image. Make ghcr.io/s4ndyp/listvault public or set GHCR_TOKEN on the Proxmox host."
  exit 1
fi
msg_ok "Pulled ListVault image"

msg_info "Starting ListVault"
$STD docker compose up -d
msg_ok "Started ListVault"

msg_info "Waiting for ListVault"
_ready=0
for _i in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:${HOST_PORT}/api/health" >/dev/null 2>&1; then
    _ready=1
    break
  fi
  sleep 2
done
if [[ "$_ready" -eq 1 ]]; then
  msg_ok "ListVault is responding on port ${HOST_PORT}"
else
  msg_warn "Container started but HTTP not ready yet — check: docker logs listvault"
fi

PORTAL_URL="http://${LOCAL_IP}"
if [[ "${HOST_PORT}" != "80" ]]; then
  PORTAL_URL="http://${LOCAL_IP}:${HOST_PORT}"
fi

cat <<EOF >~/listvault.creds
ListVault
=========
App URL:      ${PORTAL_URL}
Compose file: ${APP_DIR}/docker-compose.yml
Image:        ghcr.io/s4ndyp/listvault:latest

Data:         PocketBase volume listvault_data (/pb/pb_data)
Admin UI:     ${PORTAL_URL}/_/
Collecties:   data_lists (open rules — vertrouwd netwerk)
Offline:      Dexie-cache + outbox sync naar PocketBase
See: https://github.com/s4ndyp/listvault/blob/HEAD/readme.md
EOF
chmod 600 ~/listvault.creds

motd_ssh
customize
cleanup_lxc
