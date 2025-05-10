#!/bin/bash

# Exit on any error
set -e

# Colors for output
readonly GREEN='\033[0;32m'
readonly RED='\033[0;31m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# Configuration
readonly POSTGRES_PORT=54321
readonly REDIS_PORT=63790
readonly MAX_RETRIES=30
readonly RETRY_INTERVAL=2

# Log levels
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Function to check container runtime (Rancher Desktop)
setup_container_runtime() {
    local rd_bin="${HOME}/.rd/bin"
    
    if [ ! -x "${rd_bin}/docker" ]; then
        log_error "Rancher Desktop docker not found at ${rd_bin}/docker"
        log_info "Please install Rancher Desktop and ensure it's configured to use dockerd (moby)"
        exit 1
    fi

    export DOCKER_HOST="unix://${HOME}/.rd/docker.sock"
    if ! "${rd_bin}/docker" info >/dev/null 2>&1; then
        log_error "Failed to connect to Rancher Desktop docker daemon"
        log_info "Please ensure Rancher Desktop is running and using dockerd (moby)"
        exit 1
    fi

    export CONTAINER_RUNTIME="${rd_bin}/docker"
    log_success "Using Rancher Desktop with dockerd (moby)"
}

# Function to kill process using a port
kill_port() {
    local port=$1
    local service_name=$2

    if ! command -v lsof >/dev/null 2>&1; then
        log_warning "lsof not found, skipping port ${port} check"
        return
    fi

    log_info "Checking ${service_name} port ${port}..."
    local pid=$(lsof -ti :${port})
    if [ ! -z "$pid" ]; then
        log_warning "Killing process using port ${port} (PID: ${pid})"
        kill -9 ${pid} || log_error "Failed to kill process ${pid}"
    fi
}

# Function to run container commands
run_container_cmd() {
    if [ -z "$CONTAINER_RUNTIME" ]; then
        log_error "Container runtime not set"
        exit 1
    fi
    
    $CONTAINER_RUNTIME "$@"
}

# Function to cleanup test environment
cleanup() {
    log_info "Cleaning up test environment..."
    
    if run_container_cmd info >/dev/null 2>&1; then
        run_container_cmd compose -f docker-compose.test.yml down --remove-orphans --volumes
        run_container_cmd rm -f nanoe_test_db nanoe_test_redis 2>/dev/null || true
    fi
    
    kill_port $POSTGRES_PORT "PostgreSQL"
    kill_port $REDIS_PORT "Redis"
    
    sleep 2
    log_success "Cleanup completed"
}

# Function to check service health
check_service_health() {
    local service=$1
    local check_command=$2
    local service_name=$3
    local attempt=1

    log_info "Checking ${service_name} connection..."
    
    while [ $attempt -le $MAX_RETRIES ]; do
        if run_container_cmd ps | grep -q "$service"; then
            if run_container_cmd exec "$service" $check_command; then
                log_success "${service_name} is ready"
                return 0
            fi
        else
            log_error "${service_name} container is not running"
            run_container_cmd compose -f docker-compose.test.yml logs "$service"
            return 1
        fi
        
        log_info "Attempt ${attempt}/${MAX_RETRIES}: ${service_name} not ready yet..."
        sleep $RETRY_INTERVAL
        attempt=$((attempt + 1))
    done

    log_error "Failed to connect to ${service_name}"
    run_container_cmd ps -a | grep "$service"
    return 1
}

# Main execution
main() {
    trap cleanup EXIT
    log_info "Starting test environment setup..."

    # Setup container runtime
    setup_container_runtime

    # Clean up any existing test environment
    cleanup

    # Pull required images
    log_info "Pulling Docker images..."
    run_container_cmd pull postgres:16-alpine
    run_container_cmd pull redis:7-alpine

    # Start test containers
    log_info "Starting test containers..."
    run_container_cmd compose -f docker-compose.test.yml up -d

    # Check services health
    check_service_health "nanoe_test_db" "pg_isready -U test_user -d nanoe_test" "PostgreSQL" || exit 1
    check_service_health "nanoe_test_redis" "redis-cli ping" "Redis" || exit 1

    # Run database migrations
    log_info "Running database migrations..."
    if ! npx prisma migrate deploy; then
        log_error "Database migration failed"
        exit 1
    fi
    log_success "Database migrations completed"

    # Run the tests
    log_info "Running e2e tests..."
    if npx jest --config ./jest-e2e.config.js "$@"; then
        log_success "E2E tests completed successfully"
        exit 0
    else
        log_error "E2E tests failed"
        exit 1
    fi
}

# Execute main function
main "$@" 