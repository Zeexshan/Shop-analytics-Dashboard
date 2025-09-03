# Overview

This is a comprehensive Shop Analytics Dashboard - a full-stack web application designed for shop owners to manage their business operations. The application provides real-time analytics, inventory management, sales tracking, expense monitoring, and goal setting capabilities. Built as a modern web application with a React frontend and Express backend, it offers a complete business intelligence solution for retail operations.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development patterns
- **Routing**: Wouter for lightweight client-side routing with protected and public route components
- **State Management**: TanStack Query (React Query) for server state management and caching
- **UI Framework**: Radix UI components with shadcn/ui design system for consistent, accessible interfaces
- **Styling**: Tailwind CSS with custom CSS variables for theming and responsive design
- **Build Tool**: Vite for fast development and optimized production builds

## Backend Architecture
- **Framework**: Express.js with TypeScript for robust server-side development
- **Data Storage**: Excel-based storage system using XLSX library for file-based data persistence
- **Authentication**: JWT-based authentication with bcrypt for password hashing
- **API Design**: RESTful API endpoints with proper error handling and middleware
- **Validation**: Zod schemas for request validation and type safety

## Data Storage Solutions
- **Primary Storage**: Excel files (.xlsx) stored locally for products, sales, expenses, and goals
- **File Structure**: Organized worksheets within a single Excel file for different data entities
- **Data Management**: Custom ExcelStorage class handling CRUD operations on Excel worksheets
- **Configuration**: Drizzle ORM schemas defined for PostgreSQL compatibility (for future migration)

## Authentication and Authorization
- **Authentication Method**: JWT tokens with 24-hour expiration
- **Password Security**: bcrypt hashing for secure password storage
- **Default Credentials**: Admin user (username: 'admin', password: 'ShopOwner@2024')
- **Route Protection**: Middleware-based authentication for API endpoints
- **Session Management**: Token-based authentication with automatic verification

## External Dependencies

### Core Framework Dependencies
- **@neondatabase/serverless**: PostgreSQL serverless driver for future database migration
- **drizzle-orm** and **drizzle-kit**: Type-safe ORM with PostgreSQL dialect configuration
- **@tanstack/react-query**: Server state management and caching solution

### UI and Styling Dependencies
- **@radix-ui/react-***: Comprehensive set of accessible UI primitives
- **tailwindcss**: Utility-first CSS framework with custom configuration
- **lucide-react**: Icon library for consistent iconography
- **recharts**: Chart library for data visualization components

### Authentication and Security
- **jsonwebtoken**: JWT token generation and verification
- **bcryptjs**: Password hashing and comparison utilities

### Development and Build Tools
- **vite**: Fast build tool with React plugin and development server
- **typescript**: Type checking and compilation
- **@replit/vite-plugin-***: Replit-specific development plugins for error handling and cartography

### Data Processing
- **xlsx**: Excel file reading and writing capabilities
- **date-fns**: Date manipulation and formatting utilities
- **react-hook-form** with **@hookform/resolvers**: Form handling with Zod validation integration