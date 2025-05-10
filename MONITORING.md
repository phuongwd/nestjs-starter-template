# Monitoring Setup for Nanoe Backend

This document describes the monitoring setup for the Nanoe backend application. The monitoring stack consists of Prometheus for metrics collection and Grafana for visualization.

## Components

### Prometheus

Prometheus is an open-source monitoring and alerting system that collects metrics from configured targets at given intervals, evaluates rule expressions, displays the results, and can trigger alerts when specified conditions are observed.

- **URL**: http://localhost:9090
- **Configuration**: Located in `./prometheus/prometheus.yml`
- **Alert Rules**: Located in `./prometheus/rules/alerts.yml`

### Grafana

Grafana is an open-source platform for monitoring and observability that allows you to query, visualize, and alert on metrics and logs.

- **URL**: http://localhost:3000
- **Default Credentials**: admin/admin (change these in production)
- **Dashboards**: Pre-configured dashboards are available for:
  - API Metrics
  - System Metrics
  - PostgreSQL Metrics
  - Redis Metrics

### Exporters

The following exporters are configured to collect metrics from various components:

1. **Node Exporter**: Collects system metrics (CPU, memory, disk, network)

   - Port: 9100

2. **cAdvisor**: Collects container metrics

   - Port: 8080

3. **Postgres Exporter**: Collects PostgreSQL metrics

   - Port: 9187

4. **Redis Exporter**: Collects Redis metrics
   - Port: 9121

## Dashboards

### API Dashboard

The API dashboard provides insights into the performance and health of the API service, including:

- Request rate
- Response time
- Error rate
- Memory usage

### System Dashboard

The System dashboard provides an overview of the host system metrics, including:

- CPU usage
- Memory usage
- Disk usage
- Network traffic

### PostgreSQL Dashboard

The PostgreSQL dashboard provides insights into the database performance, including:

- Active connections
- Database operations (inserts, updates, deletes, selects)
- Transaction duration
- Database size

### Redis Dashboard

The Redis dashboard provides insights into the Redis cache performance, including:

- Connected clients
- Commands processed
- Memory usage
- Total keys
- Cache hit ratio

## Alerting

Alerts are configured in Prometheus to notify when certain conditions are met. The following alerts are configured:

1. **HighErrorRate**: Triggers when the rate of HTTP requests with a 5xx status exceeds 5% over the last 5 minutes.
2. **APIHighResponseTime**: Triggers when the 95th percentile of API response time exceeds 1 second over the last 5 minutes.
3. **InstanceDown**: Triggers when an instance is down for more than 1 minute.
4. **HighMemoryUsage**: Triggers when memory usage exceeds 85% over the last 5 minutes.

## Maintenance

### Backup and Restore

Prometheus data is stored in a Docker volume named `prometheus-data`. To backup this data:

```bash
docker run --rm -v nanoe-prometheus-data:/data -v $(pwd)/backup:/backup alpine tar -czvf /backup/prometheus-backup.tar.gz /data
```

To restore:

```bash
docker run --rm -v nanoe-prometheus-data:/data -v $(pwd)/backup:/backup alpine sh -c "rm -rf /data/* && tar -xzvf /backup/prometheus-backup.tar.gz -C /"
```

Grafana data is stored in a Docker volume named `grafana-data`. Similar backup and restore procedures can be applied.

### Scaling

For production environments with higher load, consider:

1. Increasing Prometheus storage retention
2. Setting up Prometheus federation for larger deployments
3. Configuring remote storage for long-term metrics storage

## Security Considerations

1. Change default credentials for Grafana
2. Restrict access to Prometheus and Grafana using network policies
3. Consider setting up TLS for secure communication
4. Implement proper authentication and authorization for accessing the monitoring tools

## Troubleshooting

### Common Issues

1. **Prometheus not scraping targets**:

   - Check if the target is up and running
   - Verify network connectivity
   - Check Prometheus configuration

2. **Grafana not showing data**:

   - Verify Prometheus datasource configuration
   - Check if Prometheus has the required metrics
   - Inspect Grafana logs for errors

3. **High resource usage**:
   - Adjust scrape intervals
   - Optimize storage retention
   - Consider scaling the monitoring infrastructure
