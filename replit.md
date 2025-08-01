# replit.md

## Overview

VisuoGen is a production-ready full-stack web application designed for AI-powered image and video generation. It enables users to generate visual content using a wide array of AI models, manage their creations in a personalized gallery, apply professional editing tools, share collections, and operate within a subscription-based credit system. The platform also includes robust administrative controls. The project's vision is to provide a comprehensive, intuitive solution for creative professionals and enthusiasts leveraging the latest AI capabilities in visual content creation.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript and Vite.
- **UI Components**: Radix UI primitives and shadcn/ui.
- **Styling**: Tailwind CSS with CSS variables.
- **State Management**: TanStack Query.
- **Routing**: Wouter.
- **Authentication**: Session-based, integrated with Replit Auth.

### Backend Architecture
- **Runtime**: Node.js with Express.js.
- **Database ORM**: Drizzle ORM with PostgreSQL.
- **Database Provider**: Neon serverless PostgreSQL.
- **Authentication**: Replit OpenID Connect (OIDC) with Passport.js.
- **Session Management**: Express sessions with PostgreSQL storage.

### Project Structure
- `client/`: React frontend application.
- `server/`: Express.js backend API.
- `shared/`: Shared TypeScript schemas and types.
- `migrations/`: Database migration files.

### Key Features and Implementations
- **Authentication System**: Replit OIDC, PostgreSQL-backed sessions, role-based access control.
- **Database Schema**: Comprehensive schema for users, plans, AI models, images, videos, subscriptions, credit transactions, and sessions.
- **Image Generation**: Supports 15 AI models across OpenAI, PiAPI, Stability AI, and Replicate, with a credit-based system and customizable parameters. Multi-provider cloud storage (Bunny CDN, Backblaze B2, Wasabi).
- **Video Generation**: Integrates 4 Replicate video models (ByteDance SeDance-1-Pro, Minimax Hailuo-02, Google Veo-3, KlingAI v2.1) with credit-based billing, various controls (duration, resolution, aspect ratio), and cloud storage integration for generated videos.
- **Image Editing**: Professional image editing via Clipdrop.co API (cleanup, background removal, upscaling, text inpainting, reimagining) with a standalone editor interface.
- **LoRA Training**: Integration with ModelsLab API for LoRA model training, including image upload, credit-based billing, and dedicated management interfaces.
- **Subscription & Credit Management**: Tiered subscription plans, credit packages, Stripe payment gateway integration for purchases and upgrades, and admin controls for credit and plan management.
- **Content Moderation**: Bad words content filter with severity levels for prompt filtering.
- **User Interface**: Intuitive dashboard, generation interfaces, gallery management, subscription portal, and a comprehensive admin panel. Features responsive design for all devices.
- **Sharing & Collaboration**: System for sharing images and collections with various permission levels, commenting, and collaboration invites.
- **User Engagement**: Notification system for user activities and email notifications.
- **User Management**: Admin panel functionality for creating, managing, and assigning plans/credits to users, including password resets.
- **SMTP Configuration**: Admin panel for managing and validating SMTP settings for email services.
- **UI/UX Decisions**: Modern design principles using Radix UI and Tailwind CSS, focusing on clean layouts, intuitive navigation, and responsive elements. Features like stacked AI model showcases and image comparison sliders enhance visual appeal and usability.

## External Dependencies

### Core Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting.
- **Replit Authentication**: OIDC provider for user authentication.
- **AI Image Generation APIs**: OpenAI, PiAPI, Stability AI, Replicate.
- **AI Video Generation APIs**: Replicate.
- **Image Editing API**: Clipdrop.co.
- **LoRA Training API**: ModelsLab.com.
- **Payment Gateway**: Stripe.
- **Cloud Storage**: Bunny CDN, Backblaze B2, Wasabi.

### NPM Packages
- **Frontend**: React ecosystem, Radix UI, TanStack Query, Tailwind CSS, Wouter.
- **Backend**: Express.js, Drizzle ORM, Passport.js, Zod (for schema validation).
- **Utilities**: TypeScript for type safety.