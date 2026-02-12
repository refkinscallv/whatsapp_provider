# 📘 Panduan Installasi WARF ke VPS (Ubuntu 22.04/24.04)

Panduan lengkap untuk instalasi WhatsApp API Gateway (WARF) ke VPS dari source code lokal.

---

## 📋 Prerequisites VPS

### Spesifikasi Minimum VPS
- **OS**: Ubuntu 22.04 LTS atau 24.04 LTS
- **RAM**: Minimal 2GB (Rekomendasi: 4GB)
- **Storage**: Minimal 20GB SSD
- **CPU**: Minimal 2 vCPU
- **Network**: Akses SSH dan port 80/443

### Software yang Dibutuhkan
- Node.js v20.x atau lebih tinggi
- MySQL/MariaDB Server
- Redis Server
- Nginx (sebagai reverse proxy)
- PM2 (untuk process management)
- Chromium/Chrome untuk WhatsApp-Web.js

---

## 🚀 Langkah 1: Persiapan VPS

### 1.1 Update Sistem
```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 Install Dependencies Dasar
```bash
sudo apt install -y curl wget git build-essential software-properties-common
```

### 1.3 Install Node.js v20.x
```bash
# Install Node.js menggunakan NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verifikasi instalasi
node --version  # Harus v20.x atau lebih tinggi
npm --version   # Harus v11.x atau lebih tinggi
```

### 1.4 Install MySQL/MariaDB
```bash
# Install MariaDB Server
sudo apt install -y mariadb-server mariadb-client

# Secure installation
sudo mysql_secure_installation
# Jawab pertanyaan:
# - Set root password: YES (buat password yang kuat)
# - Remove anonymous users: YES
# - Disallow root login remotely: YES
# - Remove test database: YES
# - Reload privilege tables: YES
```

### 1.5 Install Redis Server
```bash
# Install Redis
sudo apt install -y redis-server

# Enable dan start Redis
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Verifikasi Redis berjalan
redis-cli ping  # Harus return "PONG"
```

### 1.6 Install Dependencies untuk Chromium
```bash
# Install Chromium dan dependencies untuk WhatsApp-Web.js
sudo apt install -y \
    chromium-browser \
    chromium-codecs-ffmpeg \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libwayland-client0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils

# Verifikasi Chromium
which chromium-browser
```

### 1.7 Install PM2 (Process Manager)
```bash
sudo npm install -g pm2

# Enable PM2 startup script
sudo pm2 startup systemd
```

### 1.8 Install Nginx (Reverse Proxy)
```bash
sudo apt install -y nginx

# Enable Nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

---

## 💾 Langkah 2: Setup Database

### 2.1 Login ke MySQL
```bash
sudo mysql -u root -p
```

### 2.2 Buat Database dan User
```sql
-- Buat database
CREATE DATABASE whatsapp CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

-- Buat user baru (ganti 'your_password' dengan password yang kuat)
CREATE USER 'whatsapp_user'@'localhost' IDENTIFIED BY 'your_password';

-- Berikan privileges
GRANT ALL PRIVILEGES ON whatsapp.* TO 'whatsapp_user'@'localhost';

-- Flush privileges
FLUSH PRIVILEGES;

-- Keluar dari MySQL
EXIT;
```

### 2.3 Konfigurasi Redis (Opsional - Jika Perlu Password)
```bash
# Edit konfigurasi Redis
sudo nano /etc/redis/redis.conf

# Uncomment dan set password (cari baris requirepass):
# requirepass your_redis_password

# Restart Redis
sudo systemctl restart redis-server
```

---

## 📤 Langkah 3: Upload Source Code ke VPS

### 3.1 Buat User untuk Aplikasi (Best Practice)
```bash
# Buat user baru
sudo adduser warf

# Tambahkan ke grup sudo (opsional)
sudo usermod -aG sudo warf

# Beralih ke user warf
su - warf
```

### 3.2 Buat Direktori Aplikasi
```bash
# Buat direktori untuk aplikasi
mkdir -p ~/apps
cd ~/apps
```

### 3.3 Upload Source Code

**Opsi A: Menggunakan Git**
```bash
# Clone dari repository (jika source code sudah di Git)
git clone <repository_url> whatsapp_provider
cd whatsapp_provider
```

**Opsi B: Menggunakan SCP/SFTP dari Komputer Lokal**

Dari komputer lokal Windows Anda (PowerShell):
```powershell
# Kompres source code (dari folder c:\APP\KW\whatsapp\whatsapp_provider)
cd c:\APP\KW\whatsapp
tar -czf whatsapp_provider.tar.gz whatsapp_provider --exclude=node_modules --exclude=.wwebjs_cache --exclude=whatsapp_sessions --exclude=tmp --exclude=logs

# Upload ke VPS (ganti USER dan VPS_IP)
scp whatsapp_provider.tar.gz warf@VPS_IP:~/apps/

# Login ke VPS
ssh warf@VPS_IP

# Extract source code
cd ~/apps
tar -xzf whatsapp_provider.tar.gz
cd whatsapp_provider
```

**Opsi C: Menggunakan WinSCP/FileZilla**
- Gunakan WinSCP atau FileZilla untuk upload folder `whatsapp_provider`
- Pastikan exclude: `node_modules`, `.wwebjs_cache`, `whatsapp_sessions`, `tmp`, `logs`

---

## ⚙️ Langkah 4: Konfigurasi Aplikasi

### 4.1 Install Dependencies
```bash
cd ~/apps/whatsapp_provider

# Install production dependencies
npm install --production

# Atau install semua dependencies (termasuk dev)
npm install
```

### 4.2 Setup Environment Variables
```bash
# Copy file .env.example
cp .env.example .env

# Edit file .env
nano .env
```

### 4.3 Konfigurasi File .env
```bash
# Application
NODE_ENV=production
APP_PORT=3025
APP_URL=https://yourdomain.com  # Ganti dengan domain Anda
APP_NAME="WARF"
APP_TIMEZONE=Asia/Jakarta
APP_MODE=SAAS

# Server
SERVER_HTTPS=false  # Nginx akan handle SSL
SERVER_SSL_CERT_PATH=
SERVER_SSL_KEY_PATH=

# Database
DB_ENABLED=true
DB_DIALECT=mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=whatsapp
DB_USERNAME=whatsapp_user
DB_PASSWORD=your_password  # Password dari Langkah 2.2
DB_LOGGING=false
DB_TIMEZONE=+07:00
DB_CHARSET=utf8mb4
DB_COLLATE=utf8mb4_general_ci
DB_SYNC=true
DB_FORCE=false
DB_ALTER=false

# JWT
JWT_SECRET=generate_random_string_here_minimum_32_characters_secure
JWT_EXPIRES_IN=7d

# Queue Configuration (Redis)
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=  # Kosongkan jika tidak set password (Langkah 2.3)
REDIS_DB=0

# Queue Settings
QUEUE_FREE_DELAY=5000
QUEUE_PREMIUM_DELAY=0
QUEUE_MAX_ATTEMPTS=3

# WhatsApp Configuration
WHATSAPP_SESSIONS_DIR=./whatsapp_sessions
WHATSAPP_CHROME_PATH=/usr/bin/chromium-browser
WHATSAPP_WEB_VERSION_CACHE_TYPE=remote
WHATSAPP_QR_MAX_RETRIES=5
WHATSAPP_MAX_RECONNECT_ATTEMPTS=5
WHATSAPP_REINIT_DELAY=5000

# File Upload
UPLOAD_MAX_SIZE=52428800
UPLOAD_TEMP_DIR=./tmp

# Logging
LOG_DIR=logs

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Cron Jobs
CRON_SUBSCRIPTION_EXPIRY=0 0 * * *
CRON_SCHEDULED_MESSAGES=*/1 * * * *
CRON_QUEUE_PROCESSOR=*/30 * * * * *
CRON_CONTACT_SYNC=0 */6 * * *
CRON_CLEANUP=0 2 * * *
```

**Simpan file dengan**: `Ctrl+O`, `Enter`, `Ctrl+X`

### 4.4 Generate JWT Secret (Strong Random String)
```bash
# Generate secure random string untuk JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Copy output dan paste ke .env file di JWT_SECRET
```

### 4.5 Buat Direktori yang Diperlukan
```bash
# Buat folder untuk sessions, logs, dan tmp
mkdir -p whatsapp_sessions logs tmp

# Set permissions
chmod 755 whatsapp_sessions logs tmp
```

### 4.6 Initialize Database
```bash
# Setup database (create tables and seed data)
npm run setup
```

---

## 🔧 Langkah 5: Setup PM2 Process Manager

### 5.1 Buat PM2 Ecosystem File
```bash
# Buat file ecosystem.config.js
nano ecosystem.config.js
```

Paste konfigurasi berikut:
```javascript
module.exports = {
  apps: [
    {
      name: 'warf',
      script: './index.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      exp_backoff_restart_delay: 100,
    },
  ],
};
```

Simpan: `Ctrl+O`, `Enter`, `Ctrl+X`

### 5.2 Start Aplikasi dengan PM2
```bash
# Start aplikasi
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 untuk auto-start on boot
pm2 startup
# Jalankan command yang diberikan PM2 (copy-paste output)

# Check status
pm2 status
pm2 logs warf
```

### 5.3 PM2 Useful Commands
```bash
# Lihat logs
pm2 logs warf

# Monitor
pm2 monit

# Restart
pm2 restart warf

# Stop
pm2 stop warf

# Delete
pm2 delete warf
```

---

## 🌐 Langkah 6: Setup Nginx Reverse Proxy

### 6.1 Buat Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/warf
```

Paste konfigurasi berikut:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;  # Ganti dengan domain Anda

    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:3025;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout settings untuk WhatsApp connections
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Socket.IO specific configuration
    location /socket.io/ {
        proxy_pass http://localhost:3025/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket timeout
        proxy_read_timeout 86400;
    }
}
```

Simpan: `Ctrl+O`, `Enter`, `Ctrl+X`

### 6.2 Enable Nginx Site
```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/warf /etc/nginx/sites-enabled/

# Remove default site (opsional)
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## 🔐 Langkah 7: Setup SSL dengan Let's Encrypt (HTTPS)

### 7.1 Install Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 7.2 Generate SSL Certificate
```bash
# Generate certificate (ganti yourdomain.com)
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Ikuti instruksi:
# - Masukkan email
# - Agree to terms
# - Pilih redirect HTTP to HTTPS: Yes (option 2)
```

### 7.3 Test Auto-Renewal
```bash
# Test renewal
sudo certbot renew --dry-run

# Setup auto-renewal (sudah otomatis dengan systemd timer)
sudo systemctl status certbot.timer
```

---

## 🔥 Langkah 8: Setup Firewall (UFW)

### 8.1 Enable UFW
```bash
# Allow SSH
sudo ufw allow OpenSSH

# Allow HTTP
sudo ufw allow 80/tcp

# Allow HTTPS
sudo ufw allow 443/tcp

# Enable UFW
sudo ufw enable

# Check status
sudo ufw status
```

---

## ✅ Langkah 9: Verifikasi Instalasi

### 9.1 Check Application Status
```bash
# PM2 status
pm2 status

# Check logs
pm2 logs warf --lines 50

# Check Redis
redis-cli ping

# Check MySQL
sudo systemctl status mysql

# Check Nginx
sudo systemctl status nginx
```

### 9.2 Access Web Dashboard
Buka browser dan akses:
- **HTTP**: `http://yourdomain.com`
- **HTTPS**: `https://yourdomain.com`

### 9.3 Test API Endpoints
```bash
# Test health endpoint
curl http://localhost:3025/health

# Atau dari browser
curl https://yourdomain.com/health
```

---

## 🔧 Troubleshooting

### Error: Port Already in Use
```bash
# Check port 3025
sudo lsof -i :3025

# Kill process
sudo kill -9 <PID>
```

### Database Connection Failed
```bash
# Check MySQL status
sudo systemctl status mysql

# Check credentials
mysql -u whatsapp_user -p whatsapp

# Check .env DB_* variables
```

### Chromium/Puppeteer Errors
```bash
# Install missing dependencies
sudo apt install -y chromium-browser chromium-codecs-ffmpeg

# Check Chromium path
which chromium-browser

# Update .env
WHATSAPP_CHROME_PATH=/usr/bin/chromium-browser
```

### PM2 Won't Start
```bash
# Check PM2 logs
pm2 logs warf --err

# Delete and restart
pm2 delete warf
pm2 start ecosystem.config.js
```

### Nginx 502 Bad Gateway
```bash
# Check if app is running
pm2 status

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Check app logs
pm2 logs warf
```

### Redis Connection Failed
```bash
# Check Redis status
sudo systemctl status redis-server

# Test connection
redis-cli ping

# Restart Redis
sudo systemctl restart redis-server
```

---

## 📊 Monitoring dan Maintenance

### Application Logs
```bash
# PM2 logs
pm2 logs warf

# Application logs
tail -f ~/apps/whatsapp_provider/logs/error-*.log
tail -f ~/apps/whatsapp_provider/logs/combined-*.log
```

### Nginx Logs
```bash
# Access logs
sudo tail -f /var/log/nginx/access.log

# Error logs
sudo tail -f /var/log/nginx/error.log
```

### Database Backup
```bash
# Backup database
mysqldump -u whatsapp_user -p whatsapp > backup_$(date +%Y%m%d).sql

# Restore database
mysql -u whatsapp_user -p whatsapp < backup_20260212.sql
```

### Application Update
```bash
# Stop aplikasi
pm2 stop warf

# Pull latest code (jika menggunakan Git)
cd ~/apps/whatsapp_provider
git pull origin main

# Update dependencies
npm install --production

# Restart aplikasi
pm2 restart warf

# Check logs
pm2 logs warf
```

---

## 🚀 Optimization Tips

### 1. Enable Gzip Compression di Nginx
Edit `/etc/nginx/nginx.conf`:
```nginx
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss;
```

### 2. Increase PM2 Instances (Jika RAM Cukup)
Edit `ecosystem.config.js`:
```javascript
instances: 'max',  // Atau angka spesifik: 2, 4, dll
```

### 3. MySQL Optimization
Edit `/etc/mysql/my.cnf`:
```ini
[mysqld]
max_connections = 200
innodb_buffer_pool_size = 1G
```

### 4. Redis Optimization
Edit `/etc/redis/redis.conf`:
```ini
maxmemory 256mb
maxmemory-policy allkeys-lru
```

---

## 📝 Default Credentials

Setelah `npm run setup`, gunakan kredensial default:

**Admin Account:**
- Email: `admin@warf.com`
- Password: `admin123`

**⚠️ PENTING**: Segera ganti password default setelah login pertama kali!

---

## 🛡️ Security Checklist

- [ ] Ganti password database yang kuat
- [ ] Generate JWT_SECRET yang secure
- [ ] Ganti default admin password
- [ ] Enable UFW firewall
- [ ] Install SSL certificate (Let's Encrypt)
- [ ] Set Redis password (jika exposed ke internet)
- [ ] Disable root SSH login
- [ ] Setup fail2ban (opsional)
- [ ] Regular backup database
- [ ] Monitor application logs

---

## 📞 Support

Jika mengalami masalah:
1. Check logs: `pm2 logs warf`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Check database connection: `mysql -u whatsapp_user -p whatsapp`
4. Check Redis: `redis-cli ping`

---

## 📄 License

Proprietary License - All rights reserved.

---

**Dibuat pada**: 2026-02-12  
**Last Updated**: 2026-02-12  
**Version**: 1.0.0
