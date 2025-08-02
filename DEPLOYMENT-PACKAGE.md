# 🚀 VisuoGen Self-Hosting Package

This is a complete deployment package for **VisuoGen** - an AI-powered SaaS platform for multi-model image and video generation. This package contains everything you need to self-host the application on your own dedicated server.

## 📦 Package Contents

### Core Application Files
- **Source Code**: Complete React frontend and Express.js backend
- **Database Schema**: PostgreSQL with Drizzle ORM
- **Authentication**: Email-based auth system
- **AI Integration**: 14 image models + 4 video models + LoRA training

### Deployment Infrastructure
- **Docker Configuration**: Multi-stage Dockerfile for production builds
- **Docker Compose**: Full orchestration with PostgreSQL, Redis, and Nginx
- **Production Setup**: Optimized production.yml with resource limits
- **Monitoring**: Prometheus, Grafana, and health monitoring stack

### Automation Scripts
- **deploy.sh**: Automated deployment script with health checks
- **backup.sh**: Automated backup script for database and files
- **health-check.sh**: Continuous monitoring and alerting system

### Configuration Files
- **.env.example**: Complete environment configuration template
- **nginx.conf**: Production-ready Nginx reverse proxy configuration
- **init-db.sql**: Database initialization script

## 🎯 Key Features Included

### AI Generation Capabilities
- **Image Generation**: 14 AI models (OpenAI, Stability AI, Replicate, PiAPI)
- **Video Generation**: 4 video models (ByteDance, Minimax, Google Veo, KlingAI)
- **LoRA Training**: Custom model training with ModelsLab integration
- **Image Editing**: Professional editing tools via Clipdrop API

### Business Features
- **Subscription Management**: Stripe payment integration
- **Credit System**: Flexible credit-based billing
- **User Management**: Complete user authentication and profiles
- **Admin Panel**: Comprehensive administrative controls
- **Analytics**: User activity and system analytics

### Cloud Integration
- **Multi-Cloud Storage**: Bunny CDN, Backblaze B2, Wasabi support
- **Email Services**: SMTP integration for notifications
- **Content Moderation**: Bad words filtering system

## 🚀 Quick Deployment

### 1. Prerequisites
- Linux server with Docker and Docker Compose
- Domain name pointed to your server
- SSL certificate (or use auto-generated self-signed)
- Minimum 4GB RAM, 50GB storage

### 2. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit with your configurations
nano .env
```

### 3. Deploy
```bash
# Run automated deployment
chmod +x deploy.sh
./deploy.sh
```

Your VisuoGen instance will be available at `https://your-domain.com`

## 🔧 Required API Keys

The application requires API keys from various AI service providers:

### Essential Services
- **OpenAI**: For GPT-powered features and DALL-E image generation
- **ModelsLab**: For LoRA model training and custom AI models
- **Stripe**: For payment processing and subscriptions

### Additional AI Providers
- **Replicate**: For advanced AI models and video generation
- **Stability AI**: For Stable Diffusion models
- **PiAPI**: For additional image generation models
- **Clipdrop**: For professional image editing features

### Cloud Services
- **Cloud Storage**: Choose from Bunny CDN, Backblaze B2, or Wasabi
- **Email Service**: SMTP provider for user notifications

## 💼 Production Considerations

### Security
- SSL/TLS encryption with proper certificates
- Environment variable isolation
- Firewall configuration
- Regular security updates

### Performance
- Resource monitoring and scaling
- Database optimization
- CDN integration for static assets
- Caching strategies

### Backup & Recovery
- Automated database backups
- File storage backups
- Disaster recovery procedures
- Monitoring and alerting

## 📊 Monitoring & Maintenance

### Included Monitoring
- **Health Checks**: Automated service health monitoring
- **Resource Monitoring**: CPU, memory, disk usage tracking
- **Application Metrics**: User analytics and system performance
- **Alert System**: Email notifications for issues

### Management Commands
```bash
# View service status
docker-compose ps

# Check application logs
docker-compose logs -f visuogen

# Run health check
./health-check.sh status

# Create backup
./backup.sh

# Update application
git pull && docker-compose up -d --build
```

## 🔗 Architecture Overview

### Frontend (React + TypeScript)
- Modern React with TypeScript
- Tailwind CSS styling
- Radix UI components
- TanStack Query for state management
- Wouter for routing

### Backend (Node.js + Express)
- Express.js REST API
- PostgreSQL with Drizzle ORM
- Multi-provider AI integration
- Stripe payment processing
- Email authentication system

### Infrastructure
- Docker containerization
- Nginx reverse proxy
- PostgreSQL database
- Redis for caching
- Cloud storage integration

## 📞 Support & Documentation

### Included Documentation
- **README-DEPLOYMENT.md**: Detailed deployment guide
- **API Documentation**: Complete API reference
- **Configuration Guide**: Environment setup instructions
- **Troubleshooting Guide**: Common issues and solutions

### Monitoring & Logs
- Application logs in `/var/log/visuogen/`
- Health check monitoring
- Performance metrics
- Error tracking and alerting

## 🔄 Updates & Maintenance

### Automated Updates
The package includes scripts for:
- Zero-downtime deployments
- Database migrations
- Configuration updates
- Service restarts

### Manual Operations
- SSL certificate renewal
- Security patch applications
- Performance optimizations
- Feature deployments

---

**Ready to deploy?** Follow the instructions in `README-DEPLOYMENT.md` for detailed setup steps.

**Need help?** Check the troubleshooting section or review the application logs for detailed error information.

This package provides everything needed for a production-ready VisuoGen deployment with enterprise-grade reliability and performance.