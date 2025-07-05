# replit.md

## Overview

AIImageForge is a full-stack web application for AI-powered image generation. Built with a modern tech stack including React, Express.js, and PostgreSQL, it provides users with the ability to generate images using various AI models, manage their gallery, and handle subscription-based credit systems.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript and Vite as the build tool
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for client-side routing
- **Authentication**: Session-based authentication integrated with Replit Auth

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Database Provider**: Neon serverless PostgreSQL
- **Authentication**: Replit OpenID Connect (OIDC) with Passport.js
- **Session Management**: Express sessions with PostgreSQL storage

### Project Structure
```
├── client/          # React frontend application
├── server/          # Express.js backend API
├── shared/          # Shared TypeScript schemas and types
└── migrations/      # Database migration files
```

## Key Components

### Authentication System
- **Provider**: Replit OIDC for seamless integration with Replit platform
- **Session Storage**: PostgreSQL-backed sessions using connect-pg-simple
- **User Management**: Automatic user creation/updates on authentication
- **Admin Access**: Role-based access control for administrative features

### Database Schema
- **Users**: Profile information, credits, plan associations, admin flags
- **Plans**: Subscription tiers with credit allocations and feature sets
- **AI Models**: Configuration for different AI image generation models
- **Images**: User-generated images with metadata and favorites
- **Subscriptions**: User plan memberships and billing cycles
- **Credit Transactions**: Audit trail for credit usage and purchases
- **Sessions**: Authentication session persistence

### Image Generation System
- **Multi-Model Support**: Configurable AI models with different capabilities
- **Credit System**: Pay-per-generation model with subscription tiers
- **Settings Management**: Customizable generation parameters (size, style, quality)
- **Image Storage**: URL-based image storage with metadata tracking

### User Interface
- **Dashboard**: Overview of user activity, credits, and recent images
- **Generation Interface**: Model selection and prompt input with real-time settings
- **Gallery Management**: Image browsing, favoriting, and organization
- **Subscription Portal**: Plan comparison and upgrade workflows
- **Admin Panel**: System management for plans, models, and users

## Data Flow

1. **Authentication Flow**: User authenticates via Replit OIDC → Session created → User record upserted
2. **Image Generation**: User selects model → Enters prompt → Credits deducted → Image generated → Stored in database
3. **Gallery Access**: User requests images → Database query with pagination → Images returned with metadata
4. **Subscription Management**: User views plans → Selects upgrade → Billing processed → Plan updated → Credits allocated

## External Dependencies

### Core Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting
- **Replit Authentication**: OIDC provider for user authentication
- **AI Image Generation APIs**: External services for image creation (configured per model)

### NPM Packages
- **Frontend**: React ecosystem, Radix UI, TanStack Query, Tailwind CSS
- **Backend**: Express.js, Drizzle ORM, Passport.js authentication
- **Shared**: Zod for schema validation, TypeScript for type safety

## Deployment Strategy

### Development Environment
- **Vite Dev Server**: Hot module replacement for frontend development
- **Express Server**: Backend API with middleware integration
- **Database Migrations**: Drizzle Kit for schema management
- **Environment Variables**: Database URL, session secrets, OIDC configuration

### Production Build
- **Frontend**: Vite builds optimized static assets
- **Backend**: ESBuild bundles server code for Node.js execution
- **Database**: Neon handles scaling and availability
- **Sessions**: PostgreSQL-backed session persistence

### Configuration Requirements
- `DATABASE_URL`: Neon PostgreSQL connection string
- `SESSION_SECRET`: Secure random string for session encryption
- `REPL_ID`: Replit application identifier
- `ISSUER_URL`: OIDC provider endpoint (defaults to Replit)
- `REPLIT_DOMAINS`: Allowed domains for OIDC validation

## Changelog

```
Changelog:
- July 04, 2025. Initial setup
- July 04, 2025. Enhanced admin panel with comprehensive functionality:
  * Added API keys management for AI models and storage providers
  * Implemented system settings configuration
  * Added storage method selection (Local, Wasabi, Backblaze)
  * Enhanced user management with credit assignment capabilities
  * Improved plan and AI model management interfaces
  * Added secure API key storage with encrypted values
  * Implemented comprehensive admin controls for platform management
- July 04, 2025. Advanced Image Editing Features:
  * Comprehensive image editor with 15+ professional filters
  * Real-time filter preview with CSS-based effects
  * AI-powered image variations using OpenAI API (2 credits)
  * AI inpainting for selective image modification (3 credits)
  * Smart image enhancement for photos, faces, and art (2 credits)
  * Automatic colorization for black & white images (2 credits)
  * AI photo restoration for damaged/old photos (2 credits)
  * Background removal with AI precision (1 credit)
  * Image upscaling for higher resolution (1 credit)
  * Professional adjustment controls: brightness, contrast, saturation, hue, temperature, exposure
  * Creative effects: vintage, sepia, grayscale, invert filters
  * Advanced editing modal with tabbed interface and real-time preview
  * Credit-based pricing for all AI-powered editing features
- July 04, 2025. Image Upload Functionality:
  * Drag & drop image upload interface with visual feedback
  * Support for PNG, JPG, GIF files up to 10MB
  * Real-time preview of uploaded images with remove option
  * AI-powered image-to-image generation using prompts
  * Automatic variation creation from uploaded images (base cost + 1 credit)
  * Integration with existing AI models for prompt-guided transformations
- July 04, 2025. Responsive Design Implementation:
  * Mobile-first responsive layout across all devices
  * Collapsible sidebar with mobile overlay and backdrop
  * Responsive grid layouts for cards and content sections
  * Mobile-optimized header with hamburger menu toggle
  * Touch-friendly interface elements and spacing
  * Responsive typography and button sizing
  * Mobile navigation with auto-close functionality
- July 05, 2025. Enhanced Admin Panel with Storage Configuration:
  * Separate storage sections for Wasabi and BackBlaze B2 cloud storage
  * Complete pricing plan management with create, edit, delete functionality
  * Credit usage controls linked to AI model utilization
  * Comprehensive API key management for all providers
  * Fixed authentication issues by granting admin access to users
  * Provider status overview with visual configuration indicators
  * Storage method selection with development and production options
  * Fixed API key update functionality with proper parameter ordering in apiRequest calls
  * Converted forms to controlled components for reliable Select dropdown integration
- July 05, 2025. Image Sharing and Collaboration System:
  * Complete sharing system allowing users to create shareable links for images
  * Multiple permission levels: view-only, comment, and download access
  * Public shared image viewing with view counting and engagement tracking
  * Collection system for organizing and sharing groups of images
  * Public and private collection support with shareable tokens
  * Image commenting system with moderation (approval required)
  * Collaboration invite system for team-based image sharing
  * Share button integration directly in gallery image cards
  * Dedicated sharing management page for tracking active shares
  * Database schema for image shares, collections, comments, and collaboration invites
  * Full API endpoints for all sharing and collaboration functionality
- July 05, 2025. Storage Configuration System Fix:
  * Fixed critical API response parsing issue in storage configuration testing
  * Implemented proper JSON response handling for storage test and save mutations
  * Enhanced backend logging and validation for storage providers
  * Added comprehensive form validation with user-friendly error messages
  * Storage configuration testing now works correctly for Wasabi and Backblaze providers
  * Configuration status badges update properly after successful tests
  * Controlled form inputs maintain state correctly across user interactions
- July 05, 2025. Midjourney PiAPI Integration Fix:
  * Fixed critical polling mechanism bug in Midjourney service - was using POST instead of GET
  * Corrected task status checking to use GET /task/{taskId} endpoint as per PiAPI documentation
  * Enhanced image URL detection to handle multiple response formats (image_url, image_urls, discord_image_url)
  * Improved error handling with detailed error messages from PiAPI responses
  * Midjourney image generation now works correctly with proper task polling and completion detection
  * All AI models (OpenAI, Midjourney, Stability AI, Runware) now fully functional
- July 05, 2025. Quick Image Comparison Slider Implementation:
  * Created interactive image comparison slider component with drag functionality
  * Added comparison toggle to image editor modal for real-time before/after switching
  * Built dedicated comparison page with multiple view modes (comparison, original, edited)
  * Added comparison button to gallery image cards for quick navigation
  * Integrated comparison functionality throughout the application
- July 05, 2025. Backblaze B2 Storage Authentication Fix:
  * Fixed Backblaze B2 authorization issues with proper credential validation
  * Implemented actual connection testing instead of placeholder validation
  * Added comprehensive error handling with detailed authentication feedback
  * Enhanced admin panel with setup instructions and field validation
  * Improved storage configuration testing to verify both authorization and bucket access
  * Added better error messages for troubleshooting Backblaze configuration issues
  * Fixed field name mismatch between config test and upload functions (applicationKeyId vs keyId)
  * Corrected StorageConfig interface to use consistent field naming throughout the system
  * Updated to B2 API v4 for improved compatibility with newer response structure
  * Enhanced logging for detailed upload process debugging and error identification
  * RESOLVED: Fixed SHA1 hash calculation for Backblaze uploads (was using "unverified" placeholder)
  * Backblaze B2 uploads now working correctly with proper SHA1 hash validation
- July 05, 2025. Batch Image Generation System Implementation:
  * Complete batch generation infrastructure with database tables for jobs and items
  * Backend API endpoints for creating, managing, and processing batch jobs
  * Asynchronous batch processing with progress tracking and error handling
  * Credit validation and deduction for batch operations
  * Frontend interface for creating batches with multiple prompts
  * Real-time progress monitoring with status indicators and completion tracking
  * Batch job management with start, cancel, and delete functionality
  * Navigation integration with sidebar menu for easy access
  * Support for all AI models with credit cost calculation per batch item
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```