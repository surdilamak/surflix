# 🚀 Surflix · GitHub Deployment Guide

The most proper way to deploy Surflix: use GitHub for source code + GHCR (GitHub Container Registry) for the pre-built Docker image.

## 📊 Architecture

```
┌──────────────┐                     ┌─────────────┐
│  You (dev)   │   git push          │   GitHub    │
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
                              │  request.surflix.my.id  │
                              └─────────────────────────┘
```

**Benefits**:
- To update, just `git push` → image auto-builds → on Unraid `docker compose pull && up -d`
- Your image is hosted for free on GHCR (private or public)
- You can roll back to an older version (versioned image tags)
- You can share the image with friends if you want (if public)

---

## Step 1: Setup GitHub Repo

### 1.1 Create a new repo

1. Log in to GitHub
2. Click **+** → **New repository**
3. **Repository name**: `surflix`
4. **Visibility**: Private (recommended, so nobody can see your .env.example) or Public
5. **DON'T** initialize with a README (we have our own file)
6. Create repository

### 1.2 Push code from local

In your Surflix folder (the one you unzipped):

```bash
cd /path/to/surflix

# Init git
git init
git add .
git commit -m "Initial commit: Surflix"

# Add remote (replace with your repo URL)
git branch -M main
git remote add origin https://github.com/<your-username>/surflix.git
git push -u origin main
```

> **Important**: Make sure `.env` is in `.gitignore` (already included by default). **Never push .env to GitHub** — it contains your secrets.

### 1.3 Update references in files

Edit `docker-compose.prod.yml`, replace `idrus` with your GitHub username:

```yaml
image: ghcr.io/idrus/surflix:latest
#               ^^^^^^ ← change this
```

Edit `install.sh`, change the default values:

```bash
GITHUB_USER="${GITHUB_USER:-idrus}"  # ← change
GITHUB_REPO="${GITHUB_REPO:-surflix}"
```

Commit & push:
```bash
git add . && git commit -m "Update GitHub username refs" && git push
```

## Step 2: Enable GitHub Container Registry

### 2.1 GitHub Actions will build the image automatically

When you pushed earlier, the `.github/workflows/docker-build.yml` file was triggered.

Check progress:
1. Your GitHub repo → **Actions** tab
2. You'll see the "Build & Publish Docker Image" workflow running
3. Wait until it finishes (~3-5 minutes the first time, faster next time thanks to the cache)

### 2.2 Verify the image has been published

1. Your GitHub repo → **Packages** (in the right sidebar)
2. You'll see the `surflix` package
3. Click it → see the tags: `latest`, `main`, etc.

### 2.3 (Optional) Make package public

By default, an image from a private repo is also private. If you want your friends to be able to use it too:

1. Package settings → **Change package visibility** → Public

If it's private, you need a **Personal Access Token (PAT)** to pull on Unraid. Set it up like this:

1. GitHub → Settings → Developer settings → Personal access tokens → **Tokens (classic)**
2. Generate new token (classic)
3. **Scopes**: ✅ `read:packages`
4. Generate & copy the token (it's only shown once!)
5. Save it somewhere safe

On Unraid, log in to GHCR:
```bash
echo "YOUR_PAT_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

## Step 3: Install on Unraid (One-Liner!)

Once the image is on GHCR, installing on Unraid is simple:

### Cara 1: One-line installer

```bash
# SSH into Unraid
ssh root@<unraid-ip>

# Run the installer (replace 'idrus' with your username)
GITHUB_USER=idrus bash <(curl -s https://raw.githubusercontent.com/idrus/surflix/main/install.sh)
```

The script will:
1. Download `docker-compose.prod.yml`, `.env.example`, `setup.sh`
2. Ask for all config values
3. Generate secrets automatically
4. Pull the image from GHCR
5. Start the container
6. Health check

### Cara 2: Manual

If you prefer manual:

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

## Step 4: Update Workflow Afterwards

After the initial deploy, when you have code updates:

### On your local machine:

```bash
# Edit code locally
git add .
git commit -m "Fix: something"
git push
```

GitHub Actions auto-triggers, and a new image is built & pushed to GHCR (~3 minutes).

### On Unraid:

There are several update options:

#### Option A: Manual pull (most reliable)
```bash
cd /mnt/user/appdata/surflix
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

#### Option B: Re-run installer (auto-detects existing install)
```bash
GITHUB_USER=idrus bash <(curl -s https://raw.githubusercontent.com/idrus/surflix/main/install.sh)
# Choose "1) Update"
```

#### Option C: Watchtower (auto-update)
Install a Watchtower container that auto-watches for new images:

```yaml
# Add to your compose, or install separately
services:
  watchtower:
    image: containrrr/watchtower
    container_name: watchtower
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      WATCHTOWER_CLEANUP: true
      WATCHTOWER_LABEL_ENABLE: true  # only update those that have the label
      WATCHTOWER_POLL_INTERVAL: 3600  # 1 hour
```

In `docker-compose.prod.yml`, Surflix already has the label `com.centurylinklabs.watchtower.enable=true`, so auto-update will work.

## Step 5: Version Tagging (Optional, Recommended)

For a stable production release:

```bash
git tag v0.1.0
git push --tags
```

GitHub Actions will build the image with these tags:
- `ghcr.io/idrus/surflix:v0.1.0`
- `ghcr.io/idrus/surflix:0.1`
- `ghcr.io/idrus/surflix:latest`

In production you can pin to a specific version:
```yaml
image: ghcr.io/idrus/surflix:v0.1.0  # will not auto-update
```

## 🎯 Comparison: Before vs After

### Before (zip upload)
```
1. Edit code locally
2. Re-zip
3. Upload via SCP (~5 minutes if the internet is slow)
4. SSH into Unraid
5. Back up the old folder
6. Extract the new zip
7. Restore .env from backup
8. docker compose down
9. docker compose build (~5 minutes to rebuild)
10. docker compose up -d
```

### After (GitHub + GHCR)
```
1. Edit code locally
2. git push (~10 seconds)
3. [GitHub Actions auto-build]
4. SSH into Unraid
5. docker compose pull && up -d (~30 seconds)
```

## 🐛 Troubleshooting

### GitHub Actions gagal build
- Check the **Actions** tab in the repo → click the failed run → view the log
- Common: Dockerfile syntax error, missing dependency

### `denied: requested access to the resource is denied`
- The package is still private and you haven't logged in to GHCR
- Solution: Log in with a PAT (see Step 2.3) or make it public

### `docker pull` keeps fetching the old image
- Solution:
  ```bash
  docker compose -f docker-compose.prod.yml pull --policy always
  # or
  docker image rm ghcr.io/idrus/surflix:latest
  docker compose -f docker-compose.prod.yml pull
  ```

### Image is too large
GitHub Actions has a storage limit:
- Public repo: unlimited GHCR usage
- Private repo: 500MB free

Set up a retention policy in Settings → Packages → Manage → Package retention.

---

## 📦 Files You Need to Update on GitHub

Before the first push, make sure to update:

| File | Change |
|------|-------|
| `docker-compose.prod.yml` | `ghcr.io/idrus/surflix` → your username |
| `install.sh` | Default `GITHUB_USER` value |
| `README.md` | Update install instructions |

---

## 🎉 Done!

Your workflow now:
- **Develop**: edit code locally
- **Deploy**: `git push` → wait 3 minutes
- **Update Unraid**: `docker compose pull && up -d` or use Watchtower
- **Share**: give friends the install.sh link, they just run it once

Good luck! 🚀
