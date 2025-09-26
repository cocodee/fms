# Installation Guide

This guide provides step-by-step instructions for installing and setting up the Fleet Management System (FMS) in different environments.

## Table of Contents

- [System Requirements](#system-requirements)
- [Quick Installation](#quick-installation)
- [Detailed Installation](#detailed-installation)
- [Configuration](#configuration)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)

## System Requirements

### Minimum Requirements

| Component | Requirement |
|-----------|-------------|
| **OS** | Ubuntu 20.04+, CentOS 8+, macOS 11+, Windows 10+ |
| **CPU** | 2 cores, 2.0 GHz |
| **RAM** | 4 GB |
| **Storage** | 20 GB free space |
| **Network** | 100 Mbps Ethernet |

### Recommended Requirements

| Component | Requirement |
|-----------|-------------|
| **OS** | Ubuntu 22.04 LTS |
| **CPU** | 4 cores, 3.0 GHz |
| **RAM** | 8 GB |
| **Storage** | 50 GB SSD |
| **Network** | 1 Gbps Ethernet |

### Software Dependencies

- **Python 3.8+**
- **Node.js 16+**
- **Docker 20.10+**
- **Docker Compose 2.0+**
- **Git**

## Quick Installation

### One-Line Installation (Linux/macOS)

```bash
curl -fsSL https://raw.githubusercontent.com/your-org/fms/main/install.sh | bash
```

### Windows Installation

```powershell
# Run in PowerShell as Administrator
iex ((New-Object System.Net.WebClient).DownloadString('https://raw.githubusercontent.com/your-org/fms/main/install.ps1'))
```

### Docker Compose (All Platforms)

```bash
# Clone repository
git clone https://github.com/your-org/fms.git
cd fms

# Start all services
docker-compose up -d

# Access web interface
open http://localhost:3000
```

## Detailed Installation

### 1. System Preparation

#### Ubuntu/Debian

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y \
    python3 \
    python3-pip \
    python3-venv \
    nodejs \
    npm \
    docker.io \
    docker-compose-plugin \
    git \
    curl \
    wget \
    unzip

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify installations
python3 --version
node --version
docker --version
docker compose version
```

#### CentOS/RHEL

```bash
# Update system
sudo dnf update -y

# Install required packages
sudo dnf install -y \\n    python3 \\n    python3-pip \\n    nodejs \\n    npm \\n    docker \\n    docker-compose \\n    git \\n    curl \\n    wget \\n    unzip

# Enable and start Docker
sudo systemctl enable docker
sudo systemctl start docker

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

#### macOS

```bash
# Install Homebrew if not already installed
/bin/bash -c \"$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\"

# Install required packages
brew install python3 node docker git

# Install Docker Desktop
brew install --cask docker

# Start Docker Desktop
open /Applications/Docker.app

# Verify installations
python3 --version
node --version
docker --version
```

#### Windows

```powershell
# Install Chocolatey (run as Administrator)
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install required packages
choco install python3 nodejs docker-desktop git -y

# Restart PowerShell
# Verify installations
python --version
node --version
docker --version
```

### 2. Source Code Setup

```bash
# Clone the repository
git clone https://github.com/your-org/fms.git
cd fms

# Check repository structure
ls -la
```

Expected structure:
```
fms/
├── agent/
├── front/
├── phone_server/
├── server/
├── zenoh-server/
├── docs/
├── docker-compose.yml
└── README.md
```

### 3. Component Installation

#### Zenoh Router

```bash
# Start Zenoh router with Docker
cd zenoh-server
docker-compose up -d

# Verify Zenoh is running
docker ps | grep zenoh
telnet localhost 7447
```

#### FMS Server

```bash
cd server

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\\Scripts\\activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Create configuration file
cp config.example.json config.json

# Test server startup
python main.py
```

**Requirements.txt:**
```txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
websockets==12.0
zenoh==0.10.1
pydantic==2.5.0
requests==2.31.0
```

#### Robot Agent

```bash
cd agent

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create configuration
cp config.example.json config.json

# Test agent startup (mock mode)
python robot_agent.py --interface mock
```

**Requirements.txt:**
```txt
zenoh==0.10.1
requests==2.31.0
numpy==1.24.3
# Optional: ROS2 dependencies
# rclpy==3.3.11
# geometry-msgs==4.2.3
# sensor-msgs==4.2.3
```

#### Frontend

```bash
cd front

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Build for production (optional)
npm run build

# Start development server
npm start
```

**.env.example:**
```bash
REACT_APP_BACKEND_HOST=localhost
REACT_APP_BACKEND_PORT=8088
REACT_APP_WS_PROTOCOL=ws
REACT_APP_API_BASE_URL=http://localhost:8088
```

#### Phone Server (Optional)

```bash
cd phone_server

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Test server startup
python phone_server.py
```

### 4. Service Installation (Production)

#### Create FMS User

```bash
# Create system user for FMS
sudo useradd -r -s /bin/false -d /opt/fms fms
sudo mkdir -p /opt/fms
sudo chown fms:fms /opt/fms
```

#### Install FMS Server Service

```bash
# Copy files to system location
sudo cp -r server /opt/fms/
sudo chown -R fms:fms /opt/fms/server

# Create systemd service
sudo tee /etc/systemd/system/fms-server.service > /dev/null <<EOF
[Unit]
Description=Fleet Management System Server
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
User=fms
Group=fms
WorkingDirectory=/opt/fms/server
Environment=PATH=/opt/fms/server/venv/bin
ExecStart=/opt/fms/server/venv/bin/python main.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable fms-server
sudo systemctl start fms-server
```

#### Install Robot Agent Service

```bash
# Copy files to system location
sudo cp -r agent /opt/robot-agent/
sudo chown -R robot:robot /opt/robot-agent

# Create systemd service template
sudo tee /etc/systemd/system/robot-agent@.service > /dev/null <<EOF
[Unit]
Description=Robot Agent %i
After=network.target

[Service]
Type=simple
User=robot
Group=robot
WorkingDirectory=/opt/robot-agent
Environment=ROBOT_ID=%i
ExecStart=/opt/robot-agent/venv/bin/python robot_agent.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Enable and start robot agents
sudo systemctl enable robot-agent@robot-001
sudo systemctl start robot-agent@robot-001
```

#### Install Frontend Service

```bash
# Build production frontend
cd front
npm run build

# Copy to web server directory
sudo cp -r build /var/www/fms
sudo chown -R www-data:www-data /var/www/fms

# Configure Nginx
sudo tee /etc/nginx/sites-available/fms > /dev/null <<EOF
server {
    listen 80;
    server_name fms.local;
    root /var/www/fms;
    index index.html;

    location / {
        try_files \\$uri \\$uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:8088;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\$host;
        proxy_cache_bypass \\$http_upgrade;
    }

    location /ws {
        proxy_pass http://localhost:8088;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\$http_upgrade;
        proxy_set_header Connection \"upgrade\";
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/fms /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Configuration

### Server Configuration

**config.json:**
```json
{
    \"zenoh_server_endpoint\": \"tcp/127.0.0.1:7447\",
    \"server\": {
        \"host\": \"0.0.0.0\",
        \"port\": 8088,
        \"cors_origins\": [\"http://localhost:3000\"],
        \"log_level\": \"INFO\"
    },
    \"robots\": {
        \"offline_timeout\": 5,
        \"battery_threshold\": 20.0
    }
}
```

### Agent Configuration

**config.json:**
```json
{
    \"zenoh_server_endpoint\": \"tcp/127.0.0.1:7447\",
    \"robot\": {
        \"interface\": \"mock\",
        \"update_frequency\": 1.0,
        \"heartbeat_frequency\": 1.0
    },
    \"ros\": {
        \"domain_id\": 42,
        \"topics\": {
            \"pose\": \"/amcl_pose\",
            \"battery\": \"/battery_state\",
            \"cmd_vel\": \"/cmd_vel\"
        }
    }
}
```

### Frontend Configuration

**.env:**
```bash
# Backend connection
REACT_APP_BACKEND_HOST=localhost
REACT_APP_BACKEND_PORT=8088
REACT_APP_WS_PROTOCOL=ws

# UI settings
REACT_APP_REFRESH_INTERVAL=1000
REACT_APP_THEME=light
REACT_APP_LANG=en
```

### Network Configuration

**Firewall Rules:**
```bash
# Allow required ports
sudo ufw allow 7447/tcp  # Zenoh router
sudo ufw allow 8088/tcp  # FMS server
sudo ufw allow 80/tcp    # Web frontend
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 8765/tcp  # Phone server (optional)
```

**Hosts File (for local testing):**
```bash
# Add to /etc/hosts (Linux/macOS) or C:\\Windows\\System32\\drivers\\etc\\hosts (Windows)
127.0.0.1 fms.local
127.0.0.1 zenoh.local
```

## Verification

### Test Installation

```bash
#!/bin/bash
# test-installation.sh

echo \"Testing FMS Installation...\"

# Test Zenoh router
echo \"Testing Zenoh router...\"
if curl -s http://localhost:8000/health > /dev/null; then
    echo \"✓ Zenoh router is running\"
else
    echo \"✗ Zenoh router is not responding\"
fi

# Test FMS server
echo \"Testing FMS server...\"
if curl -s http://localhost:8088/api/robots > /dev/null; then
    echo \"✓ FMS server is running\"
else
    echo \"✗ FMS server is not responding\"
fi

# Test frontend
echo \"Testing frontend...\"
if curl -s http://localhost:3000 > /dev/null; then
    echo \"✓ Frontend is running\"
else
    echo \"✗ Frontend is not responding\"
fi

# Test robot connectivity
echo \"Testing robot connectivity...\"
ROBOT_COUNT=$(curl -s http://localhost:8088/api/robots | jq length 2>/dev/null || echo \"0\")
echo \"Found $ROBOT_COUNT robot(s) connected\"

echo \"Installation test completed!\"
```

### Service Status Check

```bash
# Check all services
sudo systemctl status fms-server
sudo systemctl status robot-agent@robot-001
sudo systemctl status nginx
docker ps | grep zenoh

# Check logs
journalctl -u fms-server -f
journalctl -u robot-agent@robot-001 -f
```

### Performance Test

```bash
# Load test with curl
for i in {1..100}; do
    curl -s http://localhost:8088/api/robots > /dev/null &
done
wait

# Monitor system resources
top
htop
iostat 1
```

## Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Check what's using the port
sudo netstat -tulpn | grep :8088
sudo lsof -i :8088

# Kill process using port
sudo kill -9 <PID>
```

#### Permission Denied
```bash
# Fix file permissions
sudo chown -R $USER:$USER /path/to/fms
chmod +x /path/to/fms/scripts/*.sh

# Fix Docker permissions
sudo usermod -aG docker $USER
newgrp docker
```

#### Python/Node.js Version Issues
```bash
# Install specific Python version
sudo apt install python3.9 python3.9-venv python3.9-pip

# Install specific Node.js version with nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 16
nvm use 16
```

#### Zenoh Connection Failed
```bash
# Check Zenoh router status
docker logs zenoh-router

# Test Zenoh connectivity
zenoh scout
telnet localhost 7447

# Restart Zenoh router
docker-compose restart zenoh-router
```

#### Database Connection Issues
```bash
# Check PostgreSQL status (if using database)
sudo systemctl status postgresql

# Test database connection
psql -h localhost -U fms_user -d fms_production -c \"SELECT 1;\"

# Reset database permissions
sudo -u postgres psql -c \"ALTER USER fms_user PASSWORD 'new_password';\"
```

### Log Analysis

```bash
# View all FMS logs
journalctl -u fms-server -u robot-agent@robot-001 -f

# Filter error logs
journalctl -u fms-server --since \"1 hour ago\" | grep ERROR

# View Docker logs
docker logs zenoh-router --tail 100 -f
```

### Recovery Procedures

#### Clean Installation
```bash
# Stop all services
sudo systemctl stop fms-server
sudo systemctl stop robot-agent@robot-001
docker-compose down

# Remove installation
sudo rm -rf /opt/fms
sudo rm -rf /opt/robot-agent
sudo rm /etc/systemd/system/fms-server.service
sudo rm /etc/systemd/system/robot-agent@.service

# Reinstall
# Follow installation steps again
```

#### Reset Configuration
```bash
# Backup current config
sudo cp /opt/fms/server/config.json /opt/fms/server/config.json.backup

# Reset to default
sudo cp /opt/fms/server/config.example.json /opt/fms/server/config.json

# Restart services
sudo systemctl restart fms-server
```

### Getting Help

1. **Check Documentation**: Review the complete documentation in the `docs/` directory
2. **Check Logs**: Always check service logs for error messages
3. **Search Issues**: Look for similar issues in the project repository
4. **Create Issue**: If problem persists, create a detailed issue report

#### Issue Report Template

```markdown
## Environment
- OS: [Ubuntu 22.04]
- Python Version: [3.9.16]
- Node.js Version: [16.20.0]
- Docker Version: [24.0.5]

## Problem Description
[Describe the issue clearly]

## Steps to Reproduce
1. [Step 1]
2. [Step 2]
3. [Step 3]

## Expected Behavior
[What should happen]

## Actual Behavior
[What actually happens]

## Logs
```
[Include relevant log output]
```

## Configuration
[Include relevant configuration files]
```

---

For more information, see the main [README.md](../README.md) or component-specific documentation.