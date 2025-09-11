# Paper Map Generator

## Overview

The Paper Map Generator is a full-stack web application that converts digital maps into printable PDFs optimized for tabletop gaming. Users can upload map images, calibrate them with an interactive scaling tool, configure various output settings, and generate multi-page PDFs that can be printed and assembled into large physical maps. The application supports both single map processing and batch processing workflows.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend is built with React and TypeScript using Vite as the build tool. The application follows a component-based architecture with:

- **Routing**: Uses Wouter for lightweight client-side routing with pages for single map processing (`/`) and batch processing (`/batch`)
- **State Management**: React Query (TanStack Query) for server state management and caching, with local React state for UI interactions
- **UI Framework**: Shadcn/ui component library built on Radix UI primitives and styled with Tailwind CSS
- **File Handling**: React Dropzone for drag-and-drop file uploads with support for multiple image formats (JPEG, PNG, GIF, TIFF, BMP, WebP, SVG)

### Backend Architecture

The backend uses Express.js with TypeScript and follows a RESTful API design:

- **Server Setup**: Express server with middleware for JSON parsing, URL encoding, and request logging
- **Database Layer**: Drizzle ORM with PostgreSQL for data persistence, configured to use environment-based database connections
- **Storage**: Abstracted storage interface with in-memory implementation for development (can be extended to use persistent storage)
- **File Processing**: Multer for multipart file uploads with extensive format validation and Sharp for image processing
- **PDF Generation**: PDFKit for creating multi-page PDF documents with custom layouts

### Data Architecture

The application uses a PostgreSQL database with two main entities:

- **Map Projects**: Stores uploaded map metadata, calibration settings, processing status, and generated PDF references
- **Batch Jobs**: Manages batch processing workflows with job status tracking and file collections
- **Settings Schema**: Comprehensive configuration object for PDF generation including grid styles, paper sizes, colors, and output options

### Core Workflow Design

The application implements a multi-step interactive workflow:

1. **Upload Phase**: File selection with format validation and progress tracking
2. **Calibration Phase**: Interactive visual scaling tool where users match map grid lines to a cursor guide using mouse controls (zoom to scale, right-click drag to pan, left-click to confirm)
3. **Settings Configuration**: Comprehensive settings panel with real-time preview of output options
4. **Processing Phase**: Server-side PDF generation with status updates
5. **Completion Phase**: Download interface with file information and preview options

### PDF Generation System

The PDF output system creates multi-page documents with:

- **Grid-based Slicing**: Maps are divided into pages based on selected paper size and calibrated scale
- **Backside Numbering**: Optional blank pages with centered page numbers for double-sided printing
- **Assembly Guide**: Automatically generated final page showing how to arrange printed pages
- **Custom Styling**: Configurable grid overlays, cut lines, colors, and markers

### API Design

RESTful endpoints for:
- `POST /api/maps/upload` - Upload and create new map projects
- `PATCH /api/maps/:id/calibration` - Save calibration settings
- `POST /api/maps/:id/generate-pdf` - Generate PDF output
- `GET /api/maps/:id/download` - Download generated PDF
- `POST /api/batch` - Create batch processing jobs
- `GET /api/batch` - List all batch jobs with status

## External Dependencies

### Core Framework Dependencies
- **React 18**: Frontend framework with TypeScript support
- **Express.js**: Backend web server framework
- **Vite**: Frontend build tool and development server

### UI and Styling
- **Radix UI**: Headless component primitives for accessibility
- **Tailwind CSS**: Utility-first CSS framework
- **Shadcn/ui**: Pre-built component library
- **Lucide React**: Icon library

### Database and ORM
- **PostgreSQL**: Primary database (configured via DATABASE_URL)
- **Drizzle ORM**: Type-safe database toolkit
- **@neondatabase/serverless**: Serverless PostgreSQL driver

### File Processing
- **Multer**: Multipart file upload handling
- **Sharp**: High-performance image processing
- **PDFKit**: PDF document generation

### State Management
- **TanStack React Query**: Server state management and caching
- **React Hook Form**: Form state management with validation
- **Zod**: Schema validation for API inputs

### Development Tools
- **TypeScript**: Type safety across frontend and backend
- **ESBuild**: Fast JavaScript bundler for production builds
- **Wouter**: Lightweight routing library

### External Services
- **Replit Integration**: Development environment support with runtime error overlay and cartographer plugin
- **Font Loading**: Google Fonts integration for typography (Inter, Architects Daughter, DM Sans, Fira Code, Geist Mono)

The application is designed to be deployed on platforms that support Node.js with PostgreSQL database connectivity.