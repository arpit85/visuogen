# VisuoGen Self-Hosting Deployment Guide

This guide will help you deploy VisuoGen on your own dedicated server using Docker and Docker Compose.

## 🚀 Quick Start

1. **Clone/Download the project** to your server
2. **Configure environment** by copying `.env.example` to `.env`
3. **Run deployment script**: `./deploy.sh`

That's it! Your VisuoGen instance will be running at `https://your-domain.com`

## 📋 Prerequisites

- **Linux server** (Ubuntu 20.04+ recommended)
- **Docker** and **Docker Compose** installed
- **Domain name** pointed to your server
- **SSL certificate** (or use the generated self-signed ones for testing)
- **Minimum 4GB RAM** and **50GB storage**

## 🔧 Detailed Setup

### 1. Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login again to apply Docker group membership
```

### 2. Environment Configuration

Copy the example environment file and configure your settings:

```bash
cp .env.example .env
nano .env
```

#### Required Configuration:

**Authentication (Replit Auth)**
```env
SESSION_SECRET=your_very_secure_session_secret_here_at_least_32_characters
REPL_ID=your_repl_id_from_replit
REPLIT_DOMAINS=your-domain.com,www.your-domain.com
```

**AI API Keys** (Get from respective providers)
```env
OPENAI_API_KEY=sk-your_openai_api_key_here
MODELSLAB_API_KEY=your_modelslab_api_key_here
REPLICATE_API_TOKEN=r8_your_replicate_token_here
STABILITY_API_KEY=sk-your_stability_ai_key_here
PIAPI_API_KEY=your_piapi_key_here
CLIPDROP_API_KEY=your_clipdrop_key_here
```

**Payment Processing**
```env
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key_here
VITE_STRIPE_PUBLIC_KEY=pk_live_your_stripe_public_key_here
```

**Cloud Storage** (Choose one provider)
```env
# Bunny CDN (Recommended)
BUNNY_STORAGE_ZONE=your_storage_zone
BUNNY_ACCESS_KEY=your_access_key
BUNNY_HOSTNAME=your_hostname
```

**Email Configuration**
```env
SMTP_HOST=smtp.your-email-provider.com
SMTP_PORT=587
SMTP_USER=your_email@your-domain.com
SMTP_PASSWORD=your_email_password
SMTP_FROM=VisuoGen <noreply@your-domain.com>
```

### 3. SSL Certificate Setup

#### Option A: Let's Encrypt (Recommended for production)
```bash
# Install certbot
sudo apt install certbot

# Get certificate
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ssl/
sudo chown $USER:$USER ssl/*.pem
```

#### Option B: Self-signed (for testing)
```bash
mkdir -p ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout ssl/privkey.pem \
    -out ssl/fullchain.pem \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=your-domain.com"
```

### 4. Domain Configuration

Update `nginx.conf` with your domain:
```bash
sed -i 's/your-domain.com/your-actual-domain.com/g' nginx.conf
```

### 5. Deploy the Application

Run the automated deployment script:
```bash
chmod +x deploy.sh
./deploy.sh
```

The script will:
- Check prerequisites
- Set up SSL certificates
- Build and start all services
- Run database migrations
- Set up initial data

## 🔍 Verification

After deployment, verify everything is working:

1. **Check service status**:
   ```bash
   docker-compose ps
   ```

2. **View logs**:
   ```bash
   docker-compose logs -f visuogen
   ```

3. **Test the application**:
   - Visit `https://your-domain.com`
   - Check health endpoint: `https://your-domain.com/health`

## 🛠️ Management Commands

### Daily Operations
```bash
# View all service logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f visuogen
docker-compose logs -f postgres
docker-compose logs -f nginx

# Restart services
docker-compose restart

# Stop all services
docker-compose down

# Start services
docker-compose up -d
```

### Updates
```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Run database migrations if needed
docker-compose exec visuogen npm run db:push
```

### Backup
```bash
# Backup database
docker-compose exec postgres pg_dump -U visuogen visuogen > backup_$(date +%Y%m%d).sql

# Backup uploaded files (if using local storage)
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz uploads/
```

### Monitoring
```bash
# Check system resources
docker stats

# Check disk usage
df -h
docker system df

# Clean up unused Docker resources
docker system prune -a
```

## 🔒 Security Considerations

1. **Firewall Configuration**:
   ```bash
   sudo ufw allow 22    # SSH
   sudo ufw allow 80    # HTTP
   sudo ufw allow 443   # HTTPS
   sudo ufw enable
   ```

2. **Regular Updates**:
   - Keep server OS updated
   - Update Docker images regularly
   - Monitor for security patches

3. **Environment Variables**:
   - Use strong passwords
   - Keep API keys secure
   - Rotate secrets regularly

4. **SSL/TLS**:
   - Use valid SSL certificates
   - Configure proper SSL settings
   - Enable HSTS headers

## 🚨 Troubleshooting

### Common Issues

**Services not starting**:
```bash
# Check logs
docker-compose logs

# Check system resources
free -h
df -h
```

**Database connection issues**:
```bash
# Check database status
docker-compose exec postgres pg_isready -U visuogen -d visuogen

# Reset database
docker-compose down
docker volume rm visuogen_postgres_data
docker-compose up -d
```

**SSL certificate issues**:
```bash
# Check certificate validity
openssl x509 -in ssl/fullchain.pem -text -noout

# Regenerate self-signed certificate
rm ssl/*.pem
./deploy.sh
```

**Application errors**:
```bash
# Check application logs
docker-compose logs -f visuogen

# Restart application
docker-compose restart visuogen
```

## 📞 Support

For issues or questions:
1. Check the logs first: `docker-compose logs -f`
2. Verify your `.env` configuration
3. Ensure all API keys are valid
4. Check server resources (memory, disk space)

## 🔄 Scaling

For high-traffic deployments:

1. **Database**: Use managed PostgreSQL (AWS RDS, Google Cloud SQL)
2. **Storage**: Use cloud storage (AWS S3, Google Cloud Storage)
3. **Load Balancing**: Add multiple application instances
4. **Caching**: Implement Redis caching
5. **Monitoring**: Add application monitoring (Prometheus, Grafana)

## 📈 Performance Optimization

1. **Database Optimization**:
   - Configure PostgreSQL for your server specs
   - Set up database connection pooling
   - Regular database maintenance

2. **Application Optimization**:
   - Configure Node.js memory limits
   - Enable application-level caching
   - Optimize image processing

3. **Server Optimization**:
   - Configure Nginx for your traffic
   - Set up CDN for static assets
   - Monitor and optimize server resources