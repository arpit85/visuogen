#!/bin/bash

# VisuoGen Health Check Script
# Monitors the health of all services and sends alerts if needed

set -e

# Configuration
LOG_FILE="/var/log/visuogen-health.log"
ALERT_EMAIL="${ALERT_EMAIL:-admin@your-domain.com}"
CHECK_INTERVAL=300  # 5 minutes

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Check if service is running
check_service() {
    local service_name=$1
    local expected_status="Up"
    
    local status=$(docker-compose ps "$service_name" | grep "$service_name" | awk '{print $4}')
    
    if [[ "$status" == *"$expected_status"* ]]; then
        return 0
    else
        return 1
    fi
}

# Check HTTP endpoint
check_http() {
    local url=$1
    local expected_code=${2:-200}
    
    local response_code=$(curl -s -o /dev/null -w "%{http_code}" "$url" || echo "000")
    
    if [ "$response_code" = "$expected_code" ]; then
        return 0
    else
        return 1
    fi
}

# Check database connectivity
check_database() {
    if docker-compose exec -T postgres pg_isready -U visuogen -d visuogen >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Check Redis connectivity
check_redis() {
    if docker-compose exec -T redis redis-cli ping >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Check disk space
check_disk_space() {
    local threshold=${1:-85}  # 85% threshold
    
    local usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    
    if [ "$usage" -lt "$threshold" ]; then
        return 0
    else
        return 1
    fi
}

# Check memory usage
check_memory() {
    local threshold=${1:-90}  # 90% threshold
    
    local usage=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
    
    if [ "$usage" -lt "$threshold" ]; then
        return 0
    else
        return 1
    fi
}

# Send alert
send_alert() {
    local subject="$1"
    local message="$2"
    
    # Log the alert
    log "ALERT: $subject - $message"
    
    # Send email if configured
    if command -v mail >/dev/null 2>&1 && [ -n "$ALERT_EMAIL" ]; then
        echo "$message" | mail -s "$subject" "$ALERT_EMAIL"
    fi
    
    # You can add other alert mechanisms here (Slack, Discord, etc.)
}

# Main health check function
perform_health_check() {
    local issues=()
    
    log "Starting health check..."
    
    # Check Docker Compose services
    services=("visuogen" "postgres" "redis" "nginx")
    for service in "${services[@]}"; do
        if ! check_service "$service"; then
            issues+=("Service $service is not running")
        fi
    done
    
    # Check HTTP endpoints
    endpoints=(
        "http://localhost/health:200"
        "https://localhost/health:200"
    )
    
    for endpoint in "${endpoints[@]}"; do
        url=$(echo "$endpoint" | cut -d: -f1,2)
        expected_code=$(echo "$endpoint" | cut -d: -f3)
        
        if ! check_http "$url" "$expected_code"; then
            issues+=("HTTP endpoint $url is not responding correctly")
        fi
    done
    
    # Check database
    if ! check_database; then
        issues+=("PostgreSQL database is not accessible")
    fi
    
    # Check Redis
    if ! check_redis; then
        issues+=("Redis is not accessible")
    fi
    
    # Check system resources
    if ! check_disk_space 85; then
        issues+=("Disk space usage is above 85%")
    fi
    
    if ! check_memory 90; then
        issues+=("Memory usage is above 90%")
    fi
    
    # Report results
    if [ ${#issues[@]} -eq 0 ]; then
        log "Health check passed - all services are healthy"
        return 0
    else
        local alert_message="VisuoGen Health Check Failed:\n\n"
        for issue in "${issues[@]}"; do
            alert_message+="• $issue\n"
        done
        alert_message+="\nPlease check the system immediately."
        
        send_alert "VisuoGen Health Check Failed" "$alert_message"
        return 1
    fi
}

# Show status
show_status() {
    echo -e "${GREEN}VisuoGen System Status${NC}"
    echo "======================"
    echo
    
    # Service status
    echo -e "${GREEN}Docker Services:${NC}"
    docker-compose ps
    echo
    
    # System resources
    echo -e "${GREEN}System Resources:${NC}"
    echo "Memory Usage:"
    free -h
    echo
    echo "Disk Usage:"
    df -h /
    echo
    
    # Application health
    echo -e "${GREEN}Application Health:${NC}"
    if check_http "http://localhost/health"; then
        echo -e "• HTTP Health Check: ${GREEN}PASS${NC}"
    else
        echo -e "• HTTP Health Check: ${RED}FAIL${NC}"
    fi
    
    if check_database; then
        echo -e "• Database: ${GREEN}PASS${NC}"
    else
        echo -e "• Database: ${RED}FAIL${NC}"
    fi
    
    if check_redis; then
        echo -e "• Redis: ${GREEN}PASS${NC}"
    else
        echo -e "• Redis: ${RED}FAIL${NC}"
    fi
}

# Main script logic
case "$1" in
    "check")
        perform_health_check
        ;;
    "status")
        show_status
        ;;
    "monitor")
        log "Starting continuous monitoring (interval: ${CHECK_INTERVAL}s)"
        while true; do
            perform_health_check
            sleep "$CHECK_INTERVAL"
        done
        ;;
    *)
        echo "Usage: $0 {check|status|monitor}"
        echo
        echo "Commands:"
        echo "  check    - Run a single health check"
        echo "  status   - Show current system status"
        echo "  monitor  - Run continuous monitoring"
        echo
        echo "Environment Variables:"
        echo "  ALERT_EMAIL     - Email address for alerts"
        echo "  CHECK_INTERVAL  - Monitoring interval in seconds (default: 300)"
        exit 1
        ;;
esac