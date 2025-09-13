# MedChart Pro - Patient Management System

## Overview

MedChart Pro is a medical patient management system designed for healthcare professionals to manage patient records, medications, and administrations. The application provides a comprehensive interface for scanning patient barcodes, viewing patient charts, managing prescriptions, and tracking medication administration. It features a modern, responsive design built with React and TypeScript, with a focus on healthcare workflow optimization.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for fast development and building
- **UI Components**: Shadcn/ui component library with Radix UI primitives for accessibility
- **Styling**: Tailwind CSS with custom medical-themed color palette and variables
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Forms**: React Hook Form with Zod validation for type-safe form handling

### Backend Architecture
- **Server Framework**: Express.js with TypeScript
- **API Design**: RESTful API with structured error handling and request logging
- **Database Layer**: Drizzle ORM with PostgreSQL dialect for type-safe database operations
- **Data Storage**: In-memory storage simulation with fallback to actual database operations
- **Validation**: Zod schemas for runtime type checking and API validation

### Database Design
- **Patients Table**: Core patient information including demographics, medical record numbers, and structured chart data (JSON)
- **Medicines Table**: Medication catalog with unique identifiers and names
- **Prescriptions Table**: Many-to-many relationship between patients and medicines
- **Administrations Table**: Medication administration tracking with status and timestamps
- **Schema Management**: Drizzle Kit for migrations and database schema evolution

### Key Features & Components
- **Patient Scanner**: Barcode scanning interface for quick patient lookup
- **Patient Chart**: Comprehensive patient view with tabbed interface for medications, chart data, and history
- **Medication Administration**: Real-time medication scanning and administration logging
- **Patient Registration**: Form-based patient creation with validation
- **Chart Data Management**: Rich text support for medical documentation

### Authentication & Security
- **Session Management**: Cookie-based sessions with PostgreSQL session store
- **Data Validation**: Input sanitization and type checking at API boundaries
- **Error Handling**: Structured error responses with appropriate HTTP status codes

### Development & Build System
- **Build Tool**: Vite for fast development and optimized production builds
- **Code Quality**: TypeScript strict mode with comprehensive type checking
- **Asset Management**: Static asset serving with Vite's asset pipeline
- **Development Server**: Hot module replacement and development middleware


## External Dependencies

### Database & Storage
- **PostgreSQL**: Primary database using Neon Database serverless PostgreSQL
- **Drizzle ORM**: Type-safe database operations and schema management
- **Connect PG Simple**: PostgreSQL session store for Express sessions

### UI & Styling
- **Radix UI**: Accessible component primitives for complex UI elements
- **Tailwind CSS**: Utility-first CSS framework with custom medical theme
- **Lucide React**: Consistent icon library for UI elements
- **Font Awesome**: Additional icons for medical and UI elements


### Development Tools
- **Vite**: Build tool and development server
- **TypeScript**: Static type checking and enhanced developer experience
- **ESBuild**: Fast JavaScript/TypeScript bundling for production
- **PostCSS**: CSS processing with Tailwind and Autoprefixer

### Runtime Dependencies
- **TanStack Query**: Server state management and caching
- **React Hook Form**: Form state management and validation
- **Zod**: Runtime type validation and schema definition
- **Date-fns**: Date manipulation and formatting utilities
- **Class Variance Authority**: Type-safe CSS class composition
- **CLSX**: Conditional CSS class utilities