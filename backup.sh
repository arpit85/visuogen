#!/bin/bash

# VisuoGen Backup Script
# This script creates backups of the database and uploaded files

set -e

# Configuration
BACKUP_DIR="/opt/visuogen/backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Function to backup database
backup_database() {
    print_status "Backing up PostgreSQL database..."
    
    local backup_file="$BACKUP_DIR/database_$DATE.sql"
    
    if docker-compose exec -T postgres pg_dump -U visuogen visuogen > "$backup_file"; then
        gzip "$backup_file"
        print_success "Database backup created: ${backup_file}.gz"
    else
        print_error "Database backup failed"
        return 1
    fi
}

# Function to backup uploaded files
backup_files() {
    print_status "Backing up uploaded files..."
    
    local backup_file="$BACKUP_DIR/files_$DATE.tar.gz"
    
    # Check if uploads directory exists
    if [ -d "uploads" ]; then
        if tar -czf "$backup_file" uploads/; then
            print_success "Files backup created: $backup_file"
        else
            print_error "Files backup failed"
            return 1
        fi
    else
        print_warning "No uploads directory found, skipping files backup"
    fi
}

# Function to backup configuration
backup_config() {
    print_status "Backing up configuration..."
    
    local backup_file="$BACKUP_DIR/config_$DATE.tar.gz"
    
    if tar -czf "$backup_file" \
        .env \
        docker-compose.yml \
        nginx.conf \
        ssl/ 2>/dev/null; then
        print_success "Configuration backup created: $backup_file"
    else
        print_warning "Some configuration files may be missing"
    fi
}

# Function to clean old backups
cleanup_old_backups() {
    print_status "Cleaning up old backups (older than $RETENTION_DAYS days)..."
    
    find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete
    find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
    
    print_success "Old backups cleaned up"
}

# Function to verify backups
verify_backups() {
    print_status "Verifying backups..."
    
    local database_backup="$BACKUP_DIR/database_$DATE.sql.gz"
    local files_backup="$BACKUP_DIR/files_$DATE.tar.gz"
    local config_backup="$BACKUP_DIR/config_$DATE.tar.gz"
    
    # Check database backup
    if [ -f "$database_backup" ] && [ -s "$database_backup" ]; then
        print_success "Database backup verified"
    else
        print_error "Database backup verification failed"
        return 1
    fi
    
    # Check files backup
    if [ -f "$files_backup" ] && [ -s "$files_backup" ]; then
        print_success "Files backup verified"
    else
        print_warning "Files backup not found or empty"
    fi
    
    # Check config backup
    if [ -f "$config_backup" ] && [ -s "$config_backup" ]; then
        print_success "Configuration backup verified"
    else
        print_warning "Configuration backup not found or empty"
    fi
}

# Function to upload to remote storage (optional)
upload_to_remote() {
    if [ -n "$BACKUP_REMOTE_PATH" ]; then
        print_status "Uploading backups to remote storage..."
        
        # Example for rsync to remote server
        if command -v rsync &> /dev/null; then
            rsync -avz "$BACKUP_DIR/" "$BACKUP_REMOTE_PATH/"
            print_success "Backups uploaded to remote storage"
        else
            print_warning "rsync not found, skipping remote upload"
        fi
    fi
}

# Main backup function
main() {
    print_status "Starting VisuoGen backup process..."
    
    # Check if Docker Compose is running
    if ! docker-compose ps | grep -q "Up"; then
        print_error "Docker Compose services are not running"
        exit 1
    fi
    
    # Perform backups
    backup_database
    backup_files
    backup_config
    
    # Verify backups
    verify_backups
    
    # Upload to remote storage if configured
    upload_to_remote
    
    # Cleanup old backups
    cleanup_old_backups
    
    print_success "Backup process completed successfully"
    
    # Display backup information
    echo
    print_status "Backup Summary:"
    echo "  • Date: $DATE"
    echo "  • Location: $BACKUP_DIR"
    echo "  • Files:"
    ls -lh "$BACKUP_DIR"/*_"$DATE"* 2>/dev/null || echo "    No backup files found"
}

# Check if running as backup user
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "VisuoGen Backup Script"
    echo "Usage: $0 [options]"
    echo
    echo "Options:"
    echo "  --help, -h    Show this help message"
    echo "  --verify      Verify latest backups only"
    echo "  --cleanup     Cleanup old backups only"
    echo
    echo "Environment Variables:"
    echo "  BACKUP_REMOTE_PATH    Remote path for backup uploads"
    echo "  RETENTION_DAYS        Days to keep backups (default: 7)"
    exit 0
fi

if [ "$1" = "--verify" ]; then
    verify_backups
    exit 0
fi

if [ "$1" = "--cleanup" ]; then
    cleanup_old_backups
    exit 0
fi

# Run main backup process
main