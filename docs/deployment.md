# Deployment Guide

This guide covers deployment strategies for the Fleet Management System (FMS) across different environments from development to production.

## Table of Contents

- [Deployment Overview](#deployment-overview)
- [Development Environment](#development-environment)
- [Docker Deployment](#docker-deployment)
- [Production Deployment](#production-deployment)
- [Cloud Deployment](#cloud-deployment)
- [Monitoring and Maintenance](#monitoring-and-maintenance)
- [Scaling Strategies](#scaling-strategies)
- [Security Considerations](#security-considerations)

## Deployment Overview

### Architecture Components

The FMS consists of several deployable components:

1. **Zenoh Router**: Message broker infrastructure
2. **FMS Server**: Central coordination service
3. **Frontend**: React web application
4. **Robot Agents**: Deployed on individual robots
5. **Phone Server**: Mobile interface server (optional)

### Deployment Patterns

- **All-in-One**: Single machine deployment (development/testing)
- **Distributed**: Components on separate machines (production)
- **Cloud Native**: Containerized deployment on cloud platforms
- **Hybrid**: Mix of on-premise robots with cloud coordination

## Development Environment

### Local Development Setup

#### Prerequisites

```bash
# System requirements
- Python 3.8+
- Node.js 16+
- Docker and Docker Compose
- Git

# Platform-specific installations
# Ubuntu/Debian
sudo apt update
sudo apt install python3-pip nodejs npm docker.io docker-compose-plugin

# macOS
brew install python3 node docker
```

#### Quick Start Script

Create `start-dev.sh`:

```bash
#!/bin/bash
set -e

echo "Starting FMS Development Environment..."

# Start Zenoh router
echo "Starting Zenoh router..."
cd zenoh-server
docker-compose up -d
cd ..

# Start FMS server
echo "Starting FMS server..."
cd server
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py &
SERVER_PID=$!
cd ..

# Start frontend
echo "Starting frontend..."
cd front
npm install
npm start &
FRONTEND_PID=$!
cd ..

# Start test robot
echo "Starting test robot..."
cd agent
python3 robot_agent.py --interface mock &
AGENT_PID=$!
cd ..

echo "Development environment started!"
echo "Web Dashboard: http://localhost:3000"
echo "FMS API: http://localhost:8088"
echo "Zenoh Router: tcp://localhost:7447"

# Cleanup function
cleanup() {
    echo "Shutting down services..."
    kill $SERVER_PID $FRONTEND_PID $AGENT_PID 2>/dev/null || true
    cd zenoh-server && docker-compose down
    exit
}

trap cleanup EXIT
wait
```

Make executable and run:
```bash
chmod +x start-dev.sh
./start-dev.sh
```

### Environment Configuration

#### Development `.env` Files

**Server Environment (`server/.env`):**
```bash
ZENOH_ENDPOINT=tcp/127.0.0.1:7447
LOG_LEVEL=DEBUG
PORT=8088
CORS_ORIGINS=http://localhost:3000
```

**Frontend Environment (`front/.env`):**
```bash
REACT_APP_BACKEND_PORT=8088
REACT_APP_BACKEND_HOST=localhost
REACT_APP_WS_PROTOCOL=ws
REACT_APP_API_BASE_URL=http://localhost:8088
```

**Agent Environment (`agent/.env`):**
```bash
ROBOT_ID=robot-dev-001
ZENOH_ENDPOINT=tcp/127.0.0.1:7447
LOG_LEVEL=DEBUG
ROS_DOMAIN_ID=42
```

## Docker Deployment

### Container Images

#### Build All Images

```bash
# Build script
#!/bin/bash

echo "Building FMS Docker images..."

# Build FMS Server
cd server
docker build -t fms-server:latest .
cd ..

# Build Frontend
cd front
docker build -t fms-frontend:latest .
cd ..

# Build Robot Agent
cd agent
docker build -t fms-robot-agent:latest .
cd ..

# Build Phone Server
cd phone_server
docker build -t fms-phone-server:latest .
cd ..

echo "All images built successfully!"
```

#### Individual Dockerfiles

**FMS Server (`server/Dockerfile`):**
```dockerfile
FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN useradd -m -s /bin/bash fms
RUN chown -R fms:fms /app
USER fms

EXPOSE 8088

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8088/api/robots || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8088"]
```

**Frontend (`front/Dockerfile`):**
```dockerfile
# Multi-stage build
FROM node:16-alpine as build

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Build application
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built application
COPY --from=build /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
```

**Robot Agent (`agent/Dockerfile`):**
```dockerfile
FROM python:3.9-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Create non-root user
RUN useradd -m -s /bin/bash robot
RUN chown -R robot:robot /app
USER robot

# Environment variables
ENV ROBOT_ID=""
ENV ZENOH_ENDPOINT="tcp/zenoh-router:7447"

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import zenoh; zenoh.scout()" || exit 1

CMD ["python", "robot_agent.py", "--interface", "mock"]
```

### Docker Compose Deployment

#### Complete Stack (`docker-compose.yml`)

```yaml
version: '3.8'

services:
  zenoh-router:
    image: eclipse/zenoh:latest
    container_name: fms-zenoh-router
    ports:
      - "7447:7447"
      - "8000:8000"
    volumes:
      - zenoh-data:/zenoh-data
    command: zenohd
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "zenoh", "scout"]
      interval: 30s
      timeout: 10s
      retries: 3

  fms-server:
    image: fms-server:latest
    container_name: fms-server
    ports:
      - "8088:8088"
    environment:
      - ZENOH_ENDPOINT=tcp/zenoh-router:7447
      - LOG_LEVEL=INFO
    depends_on:
      zenoh-router:
        condition: service_healthy
    restart: unless-stopped
    volumes:
      - server-logs:/app/logs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8088/api/robots"]
      interval: 30s
      timeout: 10s
      retries: 3

  fms-frontend:
    image: fms-frontend:latest
    container_name: fms-frontend
    ports:
      - "80:80"
    environment:
      - BACKEND_HOST=fms-server
      - BACKEND_PORT=8088
    depends_on:
      fms-server:
        condition: service_healthy
    restart: unless-stopped

  robot-agent-1:
    image: fms-robot-agent:latest
    container_name: robot-agent-1
    environment:
      - ROBOT_ID=robot-001
      - ZENOH_ENDPOINT=tcp/zenoh-router:7447
      - LOG_LEVEL=INFO
    depends_on:
      zenoh-router:
        condition: service_healthy
    restart: unless-stopped

  robot-agent-2:
    image: fms-robot-agent:latest
    container_name: robot-agent-2
    environment:
      - ROBOT_ID=robot-002
      - ZENOH_ENDPOINT=tcp/zenoh-router:7447
      - LOG_LEVEL=INFO
    depends_on:
      zenoh-router:
        condition: service_healthy
    restart: unless-stopped

  phone-server:
    image: fms-phone-server:latest
    container_name: fms-phone-server
    ports:
      - "8765:8765"
    environment:
      - ZENOH_ENDPOINT=tcp/zenoh-router:7447
    depends_on:
      zenoh-router:
        condition: service_healthy
    restart: unless-stopped
    profiles:
      - mobile

volumes:
  zenoh-data:
  server-logs:

networks:
  default:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

#### Start Services

```bash
# Start core services
docker-compose up -d zenoh-router fms-server fms-frontend

# Start with mobile support
docker-compose --profile mobile up -d

# Scale robot agents
docker-compose up -d --scale robot-agent-1=3

# View logs
docker-compose logs -f fms-server
```

### Docker Swarm Deployment

For multi-host deployment:

```yaml
version: '3.8'

services:
  zenoh-router:
    image: eclipse/zenoh:latest
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.role == manager
      restart_policy:
        condition: on-failure
    ports:
      - "7447:7447"
    networks:
      - fms-network

  fms-server:
    image: fms-server:latest
    deploy:
      replicas: 2
      placement:
        constraints:
          - node.role == worker
      restart_policy:
        condition: on-failure
    ports:
      - "8088:8088"
    networks:
      - fms-network

networks:
  fms-network:
    driver: overlay
    attachable: true
```

Deploy to swarm:
```bash
docker stack deploy -c docker-compose.swarm.yml fms
```

## Production Deployment

### Production-Ready Configuration

#### Security Hardening

**Server Configuration (`server/config.prod.json`):**
```json
{
  "zenoh_server_endpoint": "tcp/zenoh.internal:7447",
  "security": {
    "enable_cors": false,
    "allowed_origins": ["https://fms.company.com"],
    "rate_limiting": {
      "enabled": true,
      "requests_per_minute": 60
    }
  },
  "logging": {
    "level": "INFO",
    "file": "/var/log/fms/server.log",
    "max_size": "100MB",
    "backup_count": 5
  }
}
```

**Nginx Configuration (`nginx.conf`):**
```nginx
upstream fms-backend {
    server fms-server-1:8088;
    server fms-server-2:8088;
    keepalive 32;
}

server {
    listen 443 ssl http2;
    server_name fms.company.com;

    ssl_certificate /etc/ssl/certs/fms.company.com.crt;
    ssl_certificate_key /etc/ssl/private/fms.company.com.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Frontend static files
    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API proxy
    location /api/ {
        proxy_pass http://fms-backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket proxy
    location /ws {
        proxy_pass http://fms-backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name fms.company.com;
    return 301 https://$server_name$request_uri;
}
```

### Systemd Service Configuration

#### FMS Server Service

**`/etc/systemd/system/fms-server.service`:**
```ini
[Unit]
Description=Fleet Management System Server
After=network.target zenoh-router.service
Requires=zenoh-router.service

[Service]
Type=simple
User=fms
Group=fms
WorkingDirectory=/opt/fms/server
Environment=PATH=/opt/fms/server/venv/bin
Environment=PYTHONPATH=/opt/fms/server
ExecStart=/opt/fms/server/venv/bin/python main.py
ExecReload=/bin/kill -HUP $MAINPID
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=fms-server

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/fms/server/logs /tmp

# Resource limits
LimitNOFILE=65536
MemoryMax=1G
CPUQuota=200%

[Install]
WantedBy=multi-user.target
```

#### Robot Agent Service

**`/etc/systemd/system/robot-agent@.service`:**
```ini
[Unit]
Description=Robot Agent %i
After=network.target
PartOf=fms.target

[Service]
Type=simple
User=robot
Group=robot
WorkingDirectory=/opt/robot-agent
Environment=ROBOT_ID=%i
Environment=ROS_DOMAIN_ID=42
ExecStart=/opt/robot-agent/venv/bin/python robot_agent.py
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=robot-agent-%i

# Resource limits
MemoryMax=512M
CPUQuota=100%

[Install]
WantedBy=fms.target
```

**Enable and Start Services:**
```bash
# Enable services
sudo systemctl enable fms-server
sudo systemctl enable robot-agent@robot-001
sudo systemctl enable robot-agent@robot-002

# Start services
sudo systemctl start fms-server
sudo systemctl start robot-agent@robot-001
sudo systemctl start robot-agent@robot-002

# Check status
sudo systemctl status fms-server
```

### Database Setup (Future Enhancement)

**PostgreSQL Configuration:**
```sql
-- Create database and user
CREATE DATABASE fms_production;
CREATE USER fms_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE fms_production TO fms_user;

-- Create tables
\c fms_production;

CREATE TABLE robots (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100),
    model VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tasks (
    id VARCHAR(50) PRIMARY KEY,
    robot_id VARCHAR(50) REFERENCES robots(id),
    status VARCHAR(20),
    target_position JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX idx_tasks_robot_id ON tasks(robot_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);
```

## Cloud Deployment

### AWS Deployment

#### ECS Fargate Deployment

**Task Definition (`ecs-task-definition.json`):**
```json
{
  "family": "fms-server",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::account:role/fmsTaskRole",
  "containerDefinitions": [
    {
      "name": "fms-server",
      "image": "your-account.dkr.ecr.region.amazonaws.com/fms-server:latest",
      "portMappings": [
        {
          "containerPort": 8088,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "ZENOH_ENDPOINT",
          "value": "tcp/zenoh.internal:7447"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:fms/database-url"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/aws/ecs/fms-server",
          "awslogs-region": "us-west-2",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:8088/api/robots || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3
      }
    }
  ]
}
```

**Service Definition:**
```bash
aws ecs create-service \
  --cluster fms-cluster \
  --service-name fms-server \
  --task-definition fms-server:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-12345,subnet-67890],securityGroups=[sg-abcdef],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:region:account:targetgroup/fms-tg/1234567890,containerName=fms-server,containerPort=8088"
```

#### ECR Repository Setup

```bash
# Create ECR repositories
aws ecr create-repository --repository-name fms-server
aws ecr create-repository --repository-name fms-frontend
aws ecr create-repository --repository-name fms-robot-agent

# Build and push images
$(aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin your-account.dkr.ecr.us-west-2.amazonaws.com)

docker build -t fms-server .
docker tag fms-server:latest your-account.dkr.ecr.us-west-2.amazonaws.com/fms-server:latest
docker push your-account.dkr.ecr.us-west-2.amazonaws.com/fms-server:latest
```

### Kubernetes Deployment

#### Kubernetes Manifests

**Namespace (`namespace.yaml`):**
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: fms
```

**Zenoh Router (`zenoh-router.yaml`):**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: zenoh-router
  namespace: fms
spec:
  replicas: 1
  selector:
    matchLabels:
      app: zenoh-router
  template:
    metadata:
      labels:
        app: zenoh-router
    spec:
      containers:
      - name: zenoh-router
        image: eclipse/zenoh:latest
        ports:
        - containerPort: 7447
        - containerPort: 8000
        livenessProbe:
          exec:
            command:
            - zenoh
            - scout
          initialDelaySeconds: 30
          periodSeconds: 30
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"

---
apiVersion: v1
kind: Service
metadata:
  name: zenoh-router
  namespace: fms
spec:
  selector:
    app: zenoh-router
  ports:
  - name: zenoh
    port: 7447
    targetPort: 7447
  - name: http
    port: 8000
    targetPort: 8000
```

**FMS Server (`fms-server.yaml`):**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fms-server
  namespace: fms
spec:
  replicas: 2
  selector:
    matchLabels:
      app: fms-server
  template:
    metadata:
      labels:
        app: fms-server
    spec:
      containers:
      - name: fms-server
        image: fms-server:latest
        ports:
        - containerPort: 8088
        env:
        - name: ZENOH_ENDPOINT
          value: "tcp/zenoh-router:7447"
        livenessProbe:
          httpGet:
            path: /api/robots
            port: 8088
          initialDelaySeconds: 30
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /api/robots
            port: 8088
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "512Mi"
            cpu: "500m"

---
apiVersion: v1
kind: Service
metadata:
  name: fms-server
  namespace: fms
spec:
  selector:
    app: fms-server
  ports:
  - port: 8088
    targetPort: 8088
  type: ClusterIP

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: fms-ingress
  namespace: fms
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/websocket-services: fms-server
spec:
  tls:
  - hosts:
    - fms.company.com
    secretName: fms-tls
  rules:
  - host: fms.company.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: fms-server
            port:
              number: 8088
      - path: /ws
        pathType: Prefix
        backend:
          service:
            name: fms-server
            port:
              number: 8088
```

#### Deploy to Kubernetes

```bash
# Apply manifests
kubectl apply -f namespace.yaml
kubectl apply -f zenoh-router.yaml
kubectl apply -f fms-server.yaml

# Scale deployment
kubectl scale deployment fms-server --replicas=3 -n fms

# Check status
kubectl get pods -n fms
kubectl logs -f deployment/fms-server -n fms
```

## Monitoring and Maintenance

### Prometheus Monitoring

**Prometheus Configuration (`prometheus.yml`):**
```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'fms-server'
    static_configs:
      - targets: ['fms-server:8088']
    metrics_path: /metrics
    scrape_interval: 15s

  - job_name: 'zenoh-router'
    static_configs:
      - targets: ['zenoh-router:8000']
    metrics_path: /metrics
    scrape_interval: 30s
```

**Grafana Dashboard Configuration:**
```json
{
  "dashboard": {
    "title": "FMS Fleet Dashboard",
    "panels": [
      {
        "title": "Robot Count",
        "type": "stat",
        "targets": [
          {
            "expr": "fms_robots_total",
            "legendFormat": "Total Robots"
          }
        ]
      },
      {
        "title": "Active Tasks",
        "type": "graph",
        "targets": [
          {
            "expr": "fms_tasks_active",
            "legendFormat": "Active Tasks"
          }
        ]
      }
    ]
  }
}
```

### Health Checks and Alerts

**Health Check Script (`health-check.sh`):**
```bash
#!/bin/bash

# Check FMS Server health
if ! curl -f http://localhost:8088/api/robots; then
    echo "FMS Server health check failed"
    systemctl restart fms-server
fi

# Check Zenoh connectivity
if ! zenoh scout --timeout 5; then
    echo "Zenoh connectivity failed"
    systemctl restart zenoh-router
fi

# Check robot connectivity
ROBOT_COUNT=$(curl -s http://localhost:8088/api/robots | jq length)
if [ "$ROBOT_COUNT" -eq 0 ]; then
    echo "No robots connected"
    # Send alert
fi
```

### Log Management

**Fluentd Configuration (`fluent.conf`):**
```
<source>
  @type systemd
  tag systemd.fms-server
  matches [{"_SYSTEMD_UNIT": "fms-server.service"}]
  read_from_head true
</source>

<match systemd.fms-server>
  @type elasticsearch
  host elasticsearch.logging:9200
  index_name fms-logs
  type_name fluentd
</match>
```

### Backup and Recovery

**Database Backup Script:**
```bash
#!/bin/bash

BACKUP_DIR="/opt/backups/fms"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup PostgreSQL database
pg_dump -h localhost -U fms_user fms_production > $BACKUP_DIR/fms_db_$DATE.sql

# Backup configuration files
tar -czf $BACKUP_DIR/fms_config_$DATE.tar.gz /opt/fms/server/config.json /opt/fms/agent/config.json

# Upload to S3 (optional)
aws s3 cp $BACKUP_DIR/ s3://fms-backups/$(date +%Y/%m/%d)/ --recursive

# Cleanup old backups (keep 7 days)
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

## Scaling Strategies

### Horizontal Scaling

#### Load Balancer Configuration

**HAProxy Configuration:**
```
global
    daemon

defaults
    mode http
    timeout connect 5000ms
    timeout client 50000ms
    timeout server 50000ms

frontend fms_frontend
    bind *:80
    bind *:443 ssl crt /etc/ssl/certs/fms.pem
    redirect scheme https if !{ ssl_fc }
    default_backend fms_servers

backend fms_servers
    balance roundrobin
    option httpchk GET /api/robots
    server fms1 fms-server-1:8088 check
    server fms2 fms-server-2:8088 check
    server fms3 fms-server-3:8088 check
```

#### Auto-scaling Configuration

**Kubernetes HPA:**
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: fms-server-hpa
  namespace: fms
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: fms-server
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### Vertical Scaling

**Resource Limits Adjustment:**
```yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "500m"
  limits:
    memory: "2Gi"
    cpu: "2000m"
```

## Security Considerations

### Network Security

**Firewall Configuration:**
```bash
# UFW firewall rules
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow from 10.0.0.0/8 to any port 7447  # Zenoh router
sudo ufw allow from 10.0.0.0/8 to any port 8088  # FMS server
sudo ufw enable
```

**VPN Access for Robots:**
```bash
# WireGuard configuration for robot access
[Interface]
Address = 10.200.200.1/24
ListenPort = 51820
PrivateKey = [SERVER_PRIVATE_KEY]

[Peer]
PublicKey = [ROBOT_PUBLIC_KEY]
AllowedIPs = 10.200.200.2/32
```

### SSL/TLS Configuration

**Certificate Generation:**
```bash
# Let's Encrypt with Certbot
sudo certbot --nginx -d fms.company.com

# Manual certificate generation
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/fms.key \
  -out /etc/ssl/certs/fms.crt
```

### Authentication and Authorization

**JWT Token Configuration:**
```python
# server/auth.py
import jwt
from datetime import datetime, timedelta

class AuthManager:
    def __init__(self, secret_key):
        self.secret_key = secret_key
    
    def generate_token(self, user_id, permissions):
        payload = {
            'user_id': user_id,
            'permissions': permissions,
            'exp': datetime.utcnow() + timedelta(hours=24)
        }
        return jwt.encode(payload, self.secret_key, algorithm='HS256')
    
    def verify_token(self, token):
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=['HS256'])
            return payload
        except jwt.ExpiredSignatureError:
            return None
```

**API Key Management:**
```bash
# Generate API keys
openssl rand -hex 32

# Store in environment
export FMS_API_KEY="your-generated-api-key"
```

### Data Protection

**Encryption at Rest:**
```bash
# Encrypt volumes with LUKS
sudo cryptsetup luksFormat /dev/sdb
sudo cryptsetup luksOpen /dev/sdb fms-data
sudo mkfs.ext4 /dev/mapper/fms-data
```

**Backup Encryption:**
```bash
# GPG encryption for backups
gpg --cipher-algo AES256 --compress-algo 1 --s2k-mode 3 \
    --s2k-digest-algo SHA512 --s2k-count 65536 --symmetric \
    --output backup_encrypted.gpg backup.tar.gz
```

## Troubleshooting

### Common Deployment Issues

#### Container Won't Start
```bash
# Check container logs
docker logs container-name

# Check resource usage
docker stats

# Inspect container configuration
docker inspect container-name
```

#### Service Discovery Issues
```bash
# Test Zenoh connectivity
zenoh scout

# Check DNS resolution
nslookup zenoh-router

# Test network connectivity
telnet zenoh-router 7447
```

#### Performance Issues
```bash
# Monitor system resources
top
htop
iostat

# Check network latency
ping zenoh-router
traceroute zenoh-router

# Monitor application metrics
curl http://fms-server:8088/metrics
```

### Recovery Procedures

#### Database Recovery
```bash
# Restore from backup
psql -h localhost -U fms_user -d fms_production < backup.sql

# Verify data integrity
psql -h localhost -U fms_user -d fms_production -c "SELECT COUNT(*) FROM robots;"
```

#### Service Recovery
```bash
# Restart failed services
sudo systemctl restart fms-server
sudo systemctl restart zenoh-router

# Check service status
sudo systemctl status fms-server
journalctl -u fms-server -f
```

#### Container Recovery
```bash
# Restart containers
docker-compose restart fms-server

# Recreate containers
docker-compose down
docker-compose up -d

# Reset to clean state
docker system prune -a
docker volume prune
```

## Maintenance Tasks

### Regular Maintenance

**Weekly Tasks:**
```bash
#!/bin/bash
# weekly-maintenance.sh

echo "Running weekly FMS maintenance..."

# Update system packages
sudo apt update && sudo apt upgrade -y

# Clean old Docker images
docker image prune -f

# Rotate logs
journalctl --vacuum-time=30d

# Check certificate expiry
openssl x509 -in /etc/ssl/certs/fms.crt -noout -dates

# Backup database
/opt/scripts/backup-database.sh

echo "Weekly maintenance completed"
```

**Monthly Tasks:**
```bash
#!/bin/bash
# monthly-maintenance.sh

echo "Running monthly FMS maintenance..."

# Security updates
sudo unattended-upgrades

# Certificate renewal
sudo certbot renew

# Performance analysis
/opt/scripts/analyze-performance.sh

# Capacity planning review
/opt/scripts/capacity-report.sh

echo "Monthly maintenance completed"
```

### Update Procedures

**Rolling Updates:**
```bash
# Update FMS server with zero downtime
docker pull fms-server:latest
docker-compose up -d --no-deps fms-server

# Kubernetes rolling update
kubectl set image deployment/fms-server fms-server=fms-server:latest -n fms
kubectl rollout status deployment/fms-server -n fms
```

**Rollback Procedures:**
```bash
# Docker rollback
docker tag fms-server:previous fms-server:latest
docker-compose up -d --no-deps fms-server

# Kubernetes rollback
kubectl rollout undo deployment/fms-server -n fms
```

---

For more information, see the main [README.md](../README.md) or component-specific documentation.