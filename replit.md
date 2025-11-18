# Prompt Maker

## Overview

**Version:** 1.0.2 (November 16, 2025)
**Build Integrity:** 100/100
**Status:** Production Ready

Prompt Maker is an AI-powered prompt generation tool designed to help users create expert-level prompts for AI platforms and media generation tools. The application features three distinct output modes:

1. **Prompt Template** - Structured prompts optimized for Claude/GPT models with enhanced field organization
2. **Prompt Engineer Agent** - AI personas designed for media tools with personality customization
3. **Media Prompt Blueprint** - Platform-ready prompts for media generation services with generator settings

The application uses Claude 3.7 Sonnet (claude-3-7-sonnet-20250219) via the "claude-sonnet-preferred" alias to generate contextually appropriate, high-quality prompts based on user inputs. It includes a comprehensive Trust & Safety system with scoring, validation, and ethical guardrails.

### New in v1.0.2 (November 16, 2025)
- **WordPress Integration**: Save generated prompts to AI First Movers community library (aifirstmovers.net)
- **Community Sharing**: Share prompts with proper taxonomy mapping (categories, use cases, AI models)
- **Security Hardening**: Zod schema validation, generic error messages, partial credential detection
- **Application Rename**: "Promptinator" → "Prompt Maker" throughout codebase and UI

### v1.0.1 Stable Release (October 22, 2025)
- **Model Locking**: Locked Anthropic connector to claude-3-7-sonnet-20250219 via "claude-sonnet-preferred" alias
- **Improved Error Handling**: Added resolvedModel metadata and enhanced 404 model error logging
- **Template Library Integration**: WordPress-compatible JSON export for aifirstmovers.net
- **Documentation**: Created CHANGELOG.md with semantic versioning
- **Build Verification**: All type checks passing, 30s timeout for API calls
- **Release Artifact**: promptinator_v1.0.1.tar.gz (SHA256: b1fb4fe1...)
- **Post-Release Smoke Test**: ✅ Passed (24.5s response time, no mock fallback)

### v1.7 Production Ready (October 19, 2025)
- **Simplified Model Guards**: Clean assertion pattern with proper HTTP status codes
- **API Standardization**: Consistent `{ ok, code, message }` response format across all endpoints
- **Fixed Publishing Flow**: Corrected payload structure mismatch between frontend and backend
- **Mock Fallback Support**: Model guard now allows undefined modelId for mock generation
- **Download Button**: Added missing download functionality to ActionBar
- **Code Refactoring**: Complete replacement of `generatedPrompt` with `promptText` throughout codebase

### v1.6 Enhancements (October 19, 2025)
- **Decoupled Generation from Model Availability**: Generate continues with mock prompt when AI model unavailable
- **Graceful Fallback**: Shows yellow warning toast instead of error when model fails
- **Publishing Controls**: Disables Run Test/Publish when invalid model used, with clear messaging
- **Response Structure Fix**: Fixed mismatch between backend and frontend response handling

### v1.5 Enhancements (October 18, 2025)
- 8 new fields added for enhanced customization
- UI reorganized into 7 logical sections with visual cards
- Field descriptions and helpful examples on all inputs
- Schema fully aligned between frontend and backend
- Dynamic rendering logic preserved with improved organization

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build Tools**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server for fast HMR (Hot Module Replacement)
- Wouter for lightweight client-side routing (SPA architecture)
- Path aliases configured for clean imports (@/, @shared/, @assets/)

**UI Component System**
- Radix UI primitives for accessible, unstyled component foundations
- shadcn/ui design system in "new-york" style with custom theming
- Tailwind CSS for utility-first styling with custom CSS variables
- Dark mode support via class-based theme switching (localStorage persistence)
- Design philosophy: Modern productivity tool aesthetic inspired by Linear, ChatGPT, and Notion

**State Management**
- TanStack Query (React Query) for server state management and caching
- Local React state for UI interactions and form management
- Custom hooks for cross-component logic (useToast, useIsMobile)

**Form Handling**
- Dynamic form generation based on selected mode (template/agent/blueprint)
- Conditional field rendering with platform-specific configurations
- Client-side validation with real-time feedback

### Backend Architecture

**Server Framework**
- Express.js with TypeScript for API endpoints
- ESM (ECMAScript Modules) throughout the codebase
- Custom middleware for request logging and error handling
- Development-only Vite middleware integration for HMR

**API Design**
- RESTful endpoints under `/api` namespace
- POST `/api/generate` - Main endpoint for prompt generation
- POST `/api/wordpress/publish` - WordPress community library publishing
- Zod schemas for runtime request validation
- Structured error responses with appropriate HTTP status codes

**Prompt Generation Service**
- Anthropic SDK integration with Claude 3.5 Sonnet
- System prompts tailored to each output mode (template/agent/blueprint)
- Trust & Safety settings incorporated into generation context
- Temperature: 0.7, Max tokens: 4000 for balanced creativity and coherence

### Data Storage Solutions

**Current Implementation**
- In-memory storage using Map-based MemStorage class
- Implements IStorage interface for future extensibility
- nanoid for unique ID generation

**Database Schema (Configured but not yet implemented)**
- Drizzle ORM configured for PostgreSQL
- Schema defined in `shared/schema.ts`:
  - `prompts` table with fields: id, mode, title, generatedPrompt, formData, trustSettings, trustScore, createdAt
  - JSONB columns for flexible form data and trust settings storage
  - Timestamp tracking for prompt creation

**Future Database Integration**
- Neon serverless PostgreSQL configured via DATABASE_URL
- Migration files prepared in `/migrations` directory
- Connection pooling via @neondatabase/serverless

### External Dependencies

**AI Services**
- Anthropic Claude API
  - Model: claude-3-5-sonnet-20241022
  - Used for: Generating prompts based on user inputs and mode selection
  - API key required: ANTHROPIC_API_KEY environment variable

**WordPress Integration**
- WordPress REST API (aifirstmovers.net)
  - Endpoint: https://aifirstmovers.net/wp-json/wp/v2/prompts
  - Authentication: Basic Auth with Application Passwords
  - Environment variables: WP_USERNAME, WP_APP_PASSWORD (optional - feature disabled if not configured)
  - Taxonomy mapping: 19 template modes mapped to WordPress categories, use cases, and AI model tags
  - Security: Zod schema validation, generic error messages, no credential exposure in client code

**Font Services**
- Google Fonts (Inter, JetBrains Mono)
  - Inter: Primary UI font
  - JetBrains Mono: Monospace font for generated prompt display

**UI Component Libraries**
- Radix UI primitives (@radix-ui/react-*)
  - Provides accessible component foundations
  - 20+ component primitives (dialog, popover, select, etc.)
- shadcn/ui components
  - Pre-styled Radix components following design system
  - Customizable via Tailwind CSS variables

**Development Tools (Replit-specific)**
- @replit/vite-plugin-runtime-error-modal - Runtime error overlay
- @replit/vite-plugin-cartographer - Development tooling
- @replit/vite-plugin-dev-banner - Development environment banner

**Notable Technical Decisions**

1. **In-Memory Storage First**: Started with MemStorage to iterate quickly on features before committing to database schema. Implements IStorage interface to enable seamless swap to Drizzle ORM later.

2. **Mode-Based Generation**: Three distinct prompt modes require different system prompts and validation logic. Centralized in `promptGenerator.ts` service with mode-specific prompt construction.

3. **Trust & Safety System**: Comprehensive scoring algorithm (50-100 scale) based on safety settings, rubric selection, clarity level, and content type. Provides transparency scores to users.

4. **Platform-Specific Configurations**: Media Blueprint mode includes detailed platform defaults (resolutions, aspect ratios, file types) for tools like Midjourney, Runway, ElevenLabs, etc.

5. **Type Safety Across Stack**: Shared types in `@shared/schema` used by both frontend and backend, ensuring consistency in form data structures and API contracts.

6. **Validation Pipeline**: Client-side validation results displayed in ValidatorPanel component, providing immediate feedback on prompt quality, completeness, and best practices.