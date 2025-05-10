#!/bin/bash

# Stop Monitoring Services for Nanoe Backend
# This script stops Prometheus, Grafana, and the exporters

# Set colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Stopping Nanoe Backend Monitoring Services...${NC}"

# Check if docker-compose.monitoring.yml exists
if [ ! -f "docker-compose.monitoring.yml" ]; then
  echo -e "${RED}Error: docker-compose.monitoring.yml not found. Run start-monitoring.sh first.${NC}"
  exit 1
fi

# Stop the monitoring services
echo -e "${YELLOW}Stopping monitoring services...${NC}"
docker-compose -f docker-compose.monitoring.yml down

# Check if services are stopped
if docker ps | grep -q "nanoe-prometheus" || docker ps | grep -q "nanoe-grafana"; then
  echo -e "${RED}Warning: Some monitoring services are still running. You may need to stop them manually.${NC}"
  exit 1
else
  echo -e "${GREEN}Monitoring services stopped successfully!${NC}"
fi

# Ask if user wants to remove volumes
read -p "Do you want to remove monitoring data volumes? (y/n): " remove_volumes

if [ "$remove_volumes" = "y" ] || [ "$remove_volumes" = "Y" ]; then
  echo -e "${YELLOW}Removing monitoring data volumes...${NC}"
  docker volume rm nanoe-be_prometheus-data nanoe-be_grafana-data
  echo -e "${GREEN}Monitoring data volumes removed.${NC}"
else
  echo -e "${GREEN}Monitoring data volumes preserved.${NC}"
fi

echo -e "${GREEN}Monitoring services have been stopped.${NC}" 