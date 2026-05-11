#!/bin/bash
# =====================================================
# Surflix · One-Line Installer untuk Unraid
#
# Usage (di Unraid SSH):
#   bash <(curl -s https://raw.githubusercontent.com/idrus/surflix/main/install.sh)
#
# Atau download dulu terus run:
#   wget https://raw.githubusercontent.com/idrus/surflix/main/install.sh
#   chmod +x install.sh && ./install.sh
# =====================================================

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Banner
clear
echo ""
echo -e "${BLUE}"
cat <<'EOF'
   ____             __ _ _      
  / ___| _   _ _ __/ _| (_)_  __
  \___ \| | | | '__| |_| | \ \/ /
   ___) | |_| | |  |  _| | |>  < 
  |____/ \__,_|_|  |_| |_|_/_/\_\
                                 
  Request Hub untuk Jellyfin
EOF
echo -e "${NC}"
echo ""

# Config
INSTALL_DIR="${INSTALL_DIR:-/mnt/user/appdata/surflix}"
GITHUB_USER="${GITHUB_USER:-surdilamak}"
GITHUB_REPO="${GITHUB_REPO:-surflix}"
BRANCH="${BRANCH:-main}"

# Check Docker
if ! command -v docker &> /dev/null; then
  echo -e "${RED}❌ Docker gak ke-install. Install Docker dulu (di Unraid: udah default).${NC}"
  exit 1
fi

# Check docker compose
if ! docker compose version &> /dev/null; then
  echo -e "${RED}❌ Docker Compose gak available. Update Docker lo.${NC}"
  exit 1
fi

echo -e "${BLUE}📁 Install location:${NC} $INSTALL_DIR"
echo ""

# Check existing install
if [ -d "$INSTALL_DIR" ]; then
  echo -e "${YELLOW}⚠️  Folder $INSTALL_DIR udah ada.${NC}"
  echo "Pilihan:"
  echo "  1) Update (pull image baru, keep data & .env)"
  echo "  2) Reinstall fresh (hapus semua, backup data dulu)"
  echo "  3) Cancel"
  read -p "Pilih [1/2/3]: " choice

  case $choice in
    1)
      echo -e "${BLUE}🔄 Updating...${NC}"
      cd "$INSTALL_DIR"
      docker compose -f docker-compose.prod.yml pull
      docker compose -f docker-compose.prod.yml up -d
      echo -e "${GREEN}✅ Updated!${NC}"
      docker compose -f docker-compose.prod.yml ps
      exit 0
      ;;
    2)
      echo -e "${YELLOW}🗄️  Backing up data...${NC}"
      BACKUP_DIR="/mnt/user/appdata/surflix-backup-$(date +%Y%m%d-%H%M%S)"
      mv "$INSTALL_DIR" "$BACKUP_DIR"
      echo "Old install backed up to: $BACKUP_DIR"
      ;;
    *)
      echo "Cancelled."
      exit 0
      ;;
  esac
fi

# Create folder
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# Download files
echo -e "${BLUE}📥 Downloading files...${NC}"
BASE_URL="https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${BRANCH}"

for file in docker-compose.prod.yml .env.example setup.sh; do
  if curl -fsSL "${BASE_URL}/${file}" -o "${file}"; then
    echo "  ✓ ${file}"
  else
    echo -e "${RED}  ✗ Gagal download ${file}${NC}"
    exit 1
  fi
done

chmod +x setup.sh

# Run setup
echo ""
echo -e "${BLUE}⚙️  Konfigurasi...${NC}"
echo "Setup script akan minta beberapa info. Lo bisa skip dengan Ctrl+C dan edit .env manual nanti."
echo ""
read -p "Mulai setup? [Y/n]: " confirm

if [ "$confirm" != "n" ] && [ "$confirm" != "N" ]; then
  ./setup.sh
else
  cp .env.example .env
  echo -e "${YELLOW}.env dibuat dari template. Edit dulu sebelum run: nano $INSTALL_DIR/.env${NC}"
  exit 0
fi

# Pull & start
echo ""
echo -e "${BLUE}🐳 Pulling image & starting...${NC}"
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d

echo ""
echo -e "${BLUE}⏳ Waiting for container to be ready...${NC}"
sleep 5

# Health check
if curl -sf http://localhost:3737/api/health > /dev/null; then
  echo -e "${GREEN}"
  cat <<'EOF'

  ✅ Surflix is running!

EOF
  echo -e "${NC}"
  echo "Next steps:"
  echo "  1. Setup reverse proxy buat request.surdilamak.my.id → http://<unraid-ip>:3737"
  echo "  2. Setup Jellyseerr webhook (lihat README di GitHub)"
  echo "  3. Open https://request.surdilamak.my.id"
  echo ""
  echo "Manage:"
  echo "  Logs:    cd $INSTALL_DIR && docker compose -f docker-compose.prod.yml logs -f"
  echo "  Update:  bash <(curl -s ${BASE_URL}/install.sh)"
  echo "  Restart: docker compose -f docker-compose.prod.yml restart"
  echo ""
else
  echo -e "${YELLOW}⚠️  Container started but health check failed.${NC}"
  echo "Check logs: docker compose -f docker-compose.prod.yml logs surflix"
fi
