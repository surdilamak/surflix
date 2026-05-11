# 🚀 Surflix · GitHub Deployment Guide

Cara paling proper buat deploy Surflix: pakai GitHub untuk source code + GHCR (GitHub Container Registry) untuk pre-built Docker image.

## 📊 Architecture

```
┌──────────────┐                     ┌─────────────┐
│   Lo (dev)   │   git push          │   GitHub    │
│              │ ──────────────────▶ │   Repo      │
└──────────────┘                     └──────┬──────┘
                                            │ trigger
                                            ▼
                              ┌─────────────────────────┐
                              │  GitHub Actions         │
                              │  Auto-build Docker img  │
                              └────────────┬────────────┘
                                           │ push image
                                           ▼
                              ┌─────────────────────────┐
                              │  GHCR                   │
                              │  ghcr.io/idrus/surflix  │
                              └────────────┬────────────┘
                                           │ docker pull
                                           ▼
                              ┌─────────────────────────┐
                              │  Unraid Server          │
                              │  request.surdilamak...  │
                              └─────────────────────────┘
```

**Keuntungan**:
- Update tinggal `git push` → image auto-build → di Unraid `docker compose pull && up -d`
- Image lo ke-host gratis di GHCR (private atau public)
- Bisa rollback ke versi lama (image tag versioned)
- Image bisa lo share ke temen kalau mau (kalau public)

---

## Step 1: Setup GitHub Repo

### 1.1 Buat repo baru

1. Login ke GitHub
2. Klik **+** → **New repository**
3. **Repository name**: `surflix`
4. **Visibility**: Private (recommended, biar gak ada yang lihat .env.example lo) atau Public
5. **DON'T** initialize dengan README (kita punya file sendiri)
6. Create repository

### 1.2 Push code dari local

Di folder Surflix lo (yang udah lo unzip):

```bash
cd /path/to/surflix

# Init git
git init
git add .
git commit -m "Initial commit: Surflix"

# Add remote (ganti dengan URL repo lo)
git branch -M main
git remote add origin https://github.com/<username-lo>/surflix.git
git push -u origin main
```

> **Important**: Pastiin `.env` udah ada di `.gitignore` (udah include by default). **Jangan pernah push .env ke GitHub** — itu ada secrets lo.

### 1.3 Update referensi di file

Edit `docker-compose.prod.yml`, ganti `idrus` dengan GitHub username lo:

```yaml
image: ghcr.io/idrus/surflix:latest
#               ^^^^^^ ← ganti ini
```

Edit `install.sh`, ganti default values:

```bash
GITHUB_USER="${GITHUB_USER:-idrus}"  # ← ganti
GITHUB_REPO="${GITHUB_REPO:-surflix}"
```

Commit & push:
```bash
git add . && git commit -m "Update GitHub username refs" && git push
```

## Step 2: Enable GitHub Container Registry

### 2.1 GitHub Actions akan otomatis build image

Pas lo push tadi, file `.github/workflows/docker-build.yml` ke-trigger.

Cek progress:
1. GitHub repo lo → tab **Actions**
2. Lo bakal lihat workflow "Build & Publish Docker Image" running
3. Tunggu sampai selesai (~3-5 menit first time, lebih cepet next time karena cache)

### 2.2 Verify image udah di-publish

1. GitHub repo lo → **Packages** (di sidebar kanan)
2. Lo bakal lihat package `surflix`
3. Klik → lihat tags: `latest`, `main`, dll

### 2.3 (Optional) Make package public

Default-nya, image dari private repo juga private. Kalau lo mau temen lo bisa pakai juga:

1. Package settings → **Change package visibility** → Public

Kalau private, lo butuh **Personal Access Token (PAT)** buat pull di Unraid. Setup ini:

1. GitHub → Settings → Developer settings → Personal access tokens → **Tokens (classic)**
2. Generate new token (classic)
3. **Scopes**: ✅ `read:packages`
4. Generate & copy token (cuma keliatan sekali!)
5. Save di tempat aman

Di Unraid, login ke GHCR:
```bash
echo "YOUR_PAT_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

## Step 3: Install di Unraid (One-Liner!)

Setelah image ada di GHCR, install di Unraid jadi simple:

### Cara 1: One-line installer

```bash
# SSH ke Unraid
ssh root@<unraid-ip>

# Run installer (ganti 'idrus' dengan username lo)
GITHUB_USER=idrus bash <(curl -s https://raw.githubusercontent.com/idrus/surflix/main/install.sh)
```

Script bakal:
1. Download `docker-compose.prod.yml`, `.env.example`, `setup.sh`
2. Tanya semua config values
3. Generate secrets otomatis
4. Pull image dari GHCR
5. Start container
6. Health check

### Cara 2: Manual

Kalau lo prefer manual:

```bash
mkdir -p /mnt/user/appdata/surflix
cd /mnt/user/appdata/surflix

# Download files
curl -O https://raw.githubusercontent.com/idrus/surflix/main/docker-compose.prod.yml
curl -O https://raw.githubusercontent.com/idrus/surflix/main/.env.example
curl -O https://raw.githubusercontent.com/idrus/surflix/main/setup.sh
chmod +x setup.sh

# Setup
./setup.sh

# Start
docker compose -f docker-compose.prod.yml up -d
```

## Step 4: Workflow Update Selanjutnya

Setelah initial deploy, kalau lo ada update code:

### Di local lo:

```bash
# Edit code di local
git add .
git commit -m "Fix: something"
git push
```

GitHub Actions auto-trigger, image baru di-build & di-push ke GHCR (~3 menit).

### Di Unraid:

Ada beberapa opsi update:

#### Opsi A: Manual pull (paling reliable)
```bash
cd /mnt/user/appdata/surflix
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

#### Opsi B: Re-run installer (auto-detect existing)
```bash
GITHUB_USER=idrus bash <(curl -s https://raw.githubusercontent.com/idrus/surflix/main/install.sh)
# Pilih "1) Update"
```

#### Opsi C: Watchtower (auto-update)
Install Watchtower container yang auto-watch image baru:

```yaml
# Tambah ke compose lo, atau install terpisah
services:
  watchtower:
    image: containrrr/watchtower
    container_name: watchtower
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      WATCHTOWER_CLEANUP: true
      WATCHTOWER_LABEL_ENABLE: true  # cuma update yang punya label
      WATCHTOWER_POLL_INTERVAL: 3600  # 1 jam
```

Di `docker-compose.prod.yml` Surflix udah ada label `com.centurylinklabs.watchtower.enable=true`, jadi auto-update bakal jalan.

## Step 5: Version Tagging (Optional, Recommended)

Buat production release yang stable:

```bash
git tag v0.1.0
git push --tags
```

GitHub Actions akan build image dengan tags:
- `ghcr.io/idrus/surflix:v0.1.0`
- `ghcr.io/idrus/surflix:0.1`
- `ghcr.io/idrus/surflix:latest`

Di production lo bisa pin ke versi specific:
```yaml
image: ghcr.io/idrus/surflix:v0.1.0  # gak akan auto-update
```

## 🎯 Comparison: Sebelum vs Sesudah

### Sebelum (zip upload)
```
1. Edit code di local
2. Re-zip
3. Upload via SCP (~5 menit kalau internet lemot)
4. SSH ke Unraid
5. Backup folder lama
6. Extract zip baru
7. Restore .env dari backup
8. docker compose down
9. docker compose build (~5 menit re-build)
10. docker compose up -d
```

### Sesudah (GitHub + GHCR)
```
1. Edit code di local
2. git push (~10 detik)
3. [GitHub Actions auto-build]
4. SSH ke Unraid
5. docker compose pull && up -d (~30 detik)
```

## 🐛 Troubleshooting

### GitHub Actions gagal build
- Cek tab **Actions** di repo → klik run yang failed → lihat log
- Common: Dockerfile syntax error, missing dependency

### `denied: requested access to the resource is denied`
- Package masih private dan lo belum login ke GHCR
- Solution: Login dengan PAT (lihat Step 2.3) atau make public

### `docker pull` ngambil image lama terus
- Solusi:
  ```bash
  docker compose -f docker-compose.prod.yml pull --policy always
  # atau
  docker image rm ghcr.io/idrus/surflix:latest
  docker compose -f docker-compose.prod.yml pull
  ```

### Image kebanyakan size
GitHub Actions ada limit storage:
- Public repo: unlimited GHCR usage
- Private repo: 500MB free

Setup retention policy di Settings → Packages → Manage → Package retention.

---

## 📦 Files yang Lo Butuh Update di GitHub

Sebelum first push, pastiin update:

| File | Ganti |
|------|-------|
| `docker-compose.prod.yml` | `ghcr.io/idrus/surflix` → username lo |
| `install.sh` | Default `GITHUB_USER` value |
| `README.md` | Update install instructions |

---

## 🎉 Done!

Workflow lo sekarang:
- **Develop**: edit code di local
- **Deploy**: `git push` → tunggu 3 menit
- **Update Unraid**: `docker compose pull && up -d` atau pakai Watchtower
- **Share**: kasih link install.sh ke temen, mereka tinggal run sekali

Good luck! 🚀
