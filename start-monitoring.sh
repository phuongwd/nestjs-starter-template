#!/bin/bash

# Start Monitoring Services for Nanoe Backend
# This script starts Prometheus and Grafana

# Set colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Nanoe Backend Monitoring Services...${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo -e "${RED}Error: Docker is not running. Please start Docker and try again.${NC}"
  exit 1
fi

# Create simplified monitoring configuration
echo -e "${YELLOW}Creating monitoring services configuration...${NC}"
cat > docker-compose.monitoring.yml << EOF
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:v2.48.0
    container_name: nanoe-prometheus
    volumes:
      - ./prometheus:/etc/prometheus:ro
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--web.enable-lifecycle'
    ports:
      - '9090:9090'
    restart: always
    user: '65534:65534' # nobody:nobody
    read_only: true
    tmpfs:
      - /tmp
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
    security_opt:
      - no-new-privileges:true

  grafana:
    image: grafana/grafana:10.2.0
    container_name: nanoe-grafana
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning:ro
    environment:
      - GF_SECURITY_ADMIN_USER=\${GRAFANA_ADMIN_USER:-admin}
      - GF_SECURITY_ADMIN_PASSWORD=\${GRAFANA_ADMIN_PASSWORD:-admin}
      - GF_USERS_ALLOW_SIGN_UP=false
    ports:
      - '3000:3000'
    restart: always
    depends_on:
      - prometheus
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
    security_opt:
      - no-new-privileges:true

volumes:
  prometheus-data:
  grafana-data:
EOF

# Start the monitoring services
echo -e "${YELLOW}Starting monitoring services...${NC}"
docker-compose -f docker-compose.monitoring.yml up -d

# Check if services are running
echo -e "${YELLOW}Checking service status...${NC}"
sleep 5

if docker ps | grep -q "nanoe-prometheus" && docker ps | grep -q "nanoe-grafana"; then
  echo -e "${GREEN}Monitoring services started successfully!${NC}"
  echo -e "${GREEN}Prometheus: http://localhost:9090${NC}"
  echo -e "${GREEN}Grafana: http://localhost:3000 (admin/admin)${NC}"
else
  echo -e "${RED}Error: Some services failed to start. Check logs with 'docker-compose -f docker-compose.monitoring.yml logs'${NC}"
  exit 1
fi

echo -e "${YELLOW}For more information, see MONITORING.md${NC}" 