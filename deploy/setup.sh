#!/usr/bin/env bash
# One-time setup script for a fresh GCE instance.
# Run as the deployment user (not root).
# Usage: bash setup.sh

set -euo pipefail

echo "==> Installing Docker"
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl gnupg lsb-release
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg \
  | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/debian $(lsb_release -cs) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Allow the current user to run Docker without sudo
sudo usermod -aG docker "$USER"
echo "NOTE: log out and back in (or run 'newgrp docker') for the docker group to take effect."

echo "==> Creating app directory"
sudo mkdir -p /opt/jkt48tracker
sudo chown "$USER":"$USER" /opt/jkt48tracker

echo "==> Creating .env from template"
if [[ ! -f /opt/jkt48tracker/.env ]]; then
  cp "$(dirname "$0")/env.example" /opt/jkt48tracker/.env
  echo "Edit /opt/jkt48tracker/.env and fill in the secrets, then re-run docker compose."
else
  echo ".env already exists — skipping."
fi

echo ""
echo "Setup complete. Next steps:"
echo "  1. Fill in /opt/jkt48tracker/.env"
echo "  2. Add GitHub secrets: DOCKERHUB_USERNAME, DOCKERHUB_TOKEN, GCE_HOST, GCE_USER, GCE_SSH_PRIVATE_KEY"
echo "  3. Push to main to trigger the first deployment"
