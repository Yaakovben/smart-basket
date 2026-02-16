#!/bin/bash
# ===================================
# Oracle Cloud VM Setup Script
# ===================================
# Run this on a fresh Ubuntu 22.04+ VM:
#   curl -fsSL https://raw.githubusercontent.com/Yaakovben/smart-basket/main/deploy/setup.sh | bash

set -euo pipefail

echo "========================================="
echo "  Smart Basket - Oracle Cloud Setup"
echo "========================================="

# ── 1. System Update ──
echo ">>> Updating system packages..."
sudo apt-get update -y && sudo apt-get upgrade -y

# ── 2. Install Docker ──
echo ">>> Installing Docker..."
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker "$USER"
  echo ">>> Docker installed. You may need to re-login for group changes."
else
  echo ">>> Docker already installed."
fi

# ── 3. Install Docker Compose ──
echo ">>> Installing Docker Compose..."
if ! command -v docker compose &>/dev/null; then
  sudo apt-get install -y docker-compose-plugin
else
  echo ">>> Docker Compose already installed."
fi

# ── 4. Open firewall ports ──
echo ">>> Configuring firewall (iptables)..."
sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT

# Persist iptables rules
if command -v netfilter-persistent &>/dev/null; then
  sudo netfilter-persistent save
else
  sudo apt-get install -y iptables-persistent
  sudo netfilter-persistent save
fi

# ── 5. Clone Repository ──
REPO_DIR="$HOME/smart-basket"
echo ">>> Cloning repository to $REPO_DIR..."
if [ -d "$REPO_DIR" ]; then
  echo ">>> Repository already exists. Pulling latest..."
  cd "$REPO_DIR" && git pull origin main
else
  git clone https://github.com/Yaakovben/smart-basket.git "$REPO_DIR"
fi

# ── 6. Setup Environment ──
cd "$REPO_DIR/deploy"
if [ ! -f .env ]; then
  cp .env.example .env
  echo ""
  echo "========================================="
  echo "  IMPORTANT: Edit your .env file!"
  echo "========================================="
  echo "  nano $REPO_DIR/deploy/.env"
  echo ""
  echo "  Fill in:"
  echo "    - API_DOMAIN / SOCKET_DOMAIN"
  echo "    - MONGODB_URI"
  echo "    - JWT secrets"
  echo "    - CORS_ORIGIN (your Vercel URL)"
  echo "    - GOOGLE_CLIENT_ID"
  echo "    - ADMIN_EMAIL"
  echo "========================================="
  echo ""
  echo "After editing .env, run:"
  echo "  cd $REPO_DIR/deploy && docker compose up -d --build"
  echo ""
else
  echo ">>> .env already exists."
  echo ">>> Starting services..."
  docker compose up -d --build
  echo ""
  echo "========================================="
  echo "  Services started!"
  echo "========================================="
  docker compose ps
fi
