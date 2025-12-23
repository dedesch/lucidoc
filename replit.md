# Lucidoc AI - RAG-powered Chat Application

## Overview

Lucidoc AI is a RAG (Retrieval-Augmented Generation) powered chat application that allows users to query their company's knowledge base using Amazon Bedrock. Users authenticate, create conversations, and receive AI-generated responses with source citations from their document repository.

**Core Features:**
- User authentication via AWS Cognito (email/password)
- Real-time chat interface with markdown support
- Amazon Bedrock Knowledge Base integration for RAG queries
- Automatic source citations for AI responses
- Persistent conversation history
- Mock mode for development without AWS credentials

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework:** React 18 with TypeScript
- **Routing:** Wouter (lightweight alternative to React Router)
- **State Management:** TanStack Query (React Query) for server state
- **Styling:** TailwindCSS with shadcn/ui component library
- **Animations:** Framer Motion for smooth transitions
- **Build Tool:** Vite with custom dev plugins for Replit

**Key Frontend Patterns:**
- Custom hooks pattern for auth (`use-auth.ts`) and chat (`use-chat.ts`)
- Centralized query client configuration
- Component-based UI with Radix primitives via shadcn/ui

### Backend Architecture
- **Framework:** Express.js with TypeScript
- **API Pattern:** REST endpoints under `/api/*`
- **Authentication:** JWT-based via AWS Cognito with cookie storage
- **Session Management:** HTTP-only cookies (`lucidoc_token`)

**Key Backend Patterns:**
- Middleware-based JWT verification (`jwt-verify.ts`)
- Centralized route registration in `routes.ts`
- Storage abstraction layer (`storage.ts`) for database operations
- Separate module for Bedrock integration (`bedrock.ts`)

### Data Storage
- **Database:** PostgreSQL via Neon Serverless
- **ORM:** Drizzle ORM with Zod schema validation
- **Schema Location:** `shared/schema.ts` (shared between frontend/backend)

**Database Tables:**
- `users` - User accounts (email, hashed password)
- `workspaces` - User workspaces (one per user for MVP)
- `conversations` - Chat conversation metadata
- `messages` - Individual chat messages (user/assistant roles)
- `sources` - RAG citations linked to assistant messages
- `session` - Session storage for authentication

### Authentication Flow (AWS Cognito)
1. User registers via Cognito User Pool (SignUpCommand)
2. If email verification required, user enters confirmation code (ConfirmSignUpCommand)
3. User logs in via Cognito (InitiateAuthCommand with USER_PASSWORD_AUTH flow)
4. Backend returns JWT tokens (id_token, access_token, refresh_token)
5. Tokens stored in HTTP-only cookies (`lucidoc_token`, `lucidoc_access_token`)
6. Protected routes verify JWT via JWKS-based `isAuthenticated` middleware
7. User identity (sub as userId, email, sub as tenantId) extracted from verified token
8. Local user record created/synced in PostgreSQL on first login

**Key Files:**
- `server/cognito.ts` - Cognito SDK wrapper for register, confirm, login
- `server/jwt-verify.ts` - JWKS-based JWT verification middleware
- `client/src/hooks/use-auth.ts` - Frontend auth hook with confirmation flow
- `client/src/pages/auth.tsx` - Login/register/confirm UI

### RAG Integration
- **Service:** Amazon Bedrock Agent Runtime
- **API:** RetrieveAndGenerate command
- **Model:** Claude 3 Sonnet (configurable via env)
- **Fallback:** Mock mode when `MOCK_KB=true`

## External Dependencies

### AWS Services
- **Cognito User Pool:** User authentication and JWT issuance
  - Env vars: `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`, `AWS_REGION`
- **Bedrock Knowledge Base:** RAG document retrieval and generation
  - Env vars: `BEDROCK_KB_ID`, `BEDROCK_MODEL_ARN`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`

### Database
- **Neon PostgreSQL:** Serverless Postgres hosting
  - Env var: `DATABASE_URL`
  - Uses WebSocket connection via `@neondatabase/serverless`

### Key NPM Packages
- `@aws-sdk/client-bedrock-agent-runtime` - Bedrock API calls
- `@aws-sdk/client-cognito-identity-provider` - Cognito auth
- `jose` - JWT verification
- `drizzle-orm` + `drizzle-kit` - Database ORM and migrations
- `bcryptjs` - Password hashing (for local auth fallback)
- `cookie-parser` - Cookie handling

### Environment Variables Required
```
DATABASE_URL=postgresql://...
SESSION_SECRET=<random-secret>
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<aws-key>
AWS_SECRET_ACCESS_KEY=<aws-secret>
BEDROCK_KB_ID=<knowledge-base-id>
BEDROCK_MODEL_ARN=arn:aws:bedrock:...
COGNITO_USER_POOL_ID=<pool-id>
COGNITO_CLIENT_ID=<client-id>
MOCK_KB=false
```