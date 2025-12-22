# Lucidoc AI - RAG-powered Chat Application

A modern chat application with Retrieval-Augmented Generation (RAG) capabilities powered by Amazon Bedrock Knowledge Base. Users can authenticate, create conversations, and chat with their company's knowledge base.

## Features

- **User Authentication**: Secure email/password signup and login with session-based auth
- **Chat Interface**: Real-time chat with RAG-powered responses
- **Knowledge Base Integration**: Query Amazon Bedrock Knowledge Base
- **Source Citations**: Automatic citation of sources used in responses
- **Conversation History**: Persistent storage of chats and sources
- **Mock Mode**: Test without AWS credentials using mock responses

## Tech Stack

- **Frontend**: React, TypeScript, TailwindCSS, Wouter (routing)
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL (Neon)
- **Auth**: Passport.js with bcrypt
- **RAG**: AWS Bedrock Agent Runtime (RetrieveAndGenerate)

## Setup

### 1. Environment Variables

Create a `.env` file or set Replit Secrets with the following values:

```
# Database (Replit PostgreSQL)
DATABASE_URL=postgresql://...

# Session
SESSION_SECRET=<generate-a-random-secret>

# AWS Bedrock
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<your-aws-access-key>
AWS_SECRET_ACCESS_KEY=<your-aws-secret-key>
BEDROCK_KB_ID=<your-knowledge-base-id>
BEDROCK_MODEL_ARN=arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0

# Optional: Mock mode (true = use mock responses, false = call real Bedrock)
MOCK_KB=false

NODE_ENV=development
```

### 2. Setting Secrets in Replit

1. Open your Replit project
2. Click the lock icon (Secrets) in the left sidebar
3. Add each key-value pair from above
4. The values will be available as environment variables at runtime

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Migrations

```bash
npm run db:push
```

### 5. Start Development Server

```bash
npm run dev
```

The app will run on `http://localhost:5000`.

## API Endpoints

### Authentication

- `POST /api/auth/register` - Create a new account
- `POST /api/auth/login` - Login with email and password
- `POST /api/auth/logout` - Logout
- `GET /api/me` - Get current user

### Chat

- `POST /api/chat` - Send a message to the knowledge base
  - Request: `{ message: string, conversationId?: number }`
  - Response: `{ userMessage, assistantMessage, conversationId }`
- `GET /api/conversations` - List all conversations
- `GET /api/conversations/:id` - Get conversation with message history

### Workspace

- `GET /api/workspace` - Get workspace details

## Testing the Chat Endpoint

### With curl (using real AWS):

```bash
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What is our refund policy?"}' \
  -c cookies.txt \
  -b cookies.txt
```

(First login to get a valid session cookie)

### With Mock Mode (MOCK_KB=true):

No AWS credentials needed. The endpoint returns mock responses with sample citations.

```bash
# Set MOCK_KB=true in Secrets or .env, then:
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Tell me about the project"}' \
  -c cookies.txt \
  -b cookies.txt
```

## Database Schema

### Users
- `id` (serial, PK)
- `email` (unique)
- `password` (hashed)
- `createdAt`

### Workspaces
- `id` (serial, PK)
- `userId` (FK)
- `name`
- `createdAt`

### Conversations
- `id` (serial, PK)
- `workspaceId` (FK)
- `title`
- `createdAt`

### Messages
- `id` (serial, PK)
- `conversationId` (FK)
- `role` ('user' | 'assistant')
- `content`
- `createdAt`

### Sources
- `id` (serial, PK)
- `messageId` (FK)
- `title`
- `url`
- `score` (relevance score 0-100)

## How RAG Works

1. User sends a message via the chat interface
2. Backend receives the message at `POST /api/chat`
3. Message is stored in the database
4. Backend calls AWS Bedrock `RetrieveAndGenerate` with the user's message
5. Bedrock searches the Knowledge Base and returns:
   - Answer text (generated response)
   - Retrieval results (source documents with relevance scores)
6. Backend parses citations and stores them as `Source` records
7. Response is sent back to frontend with answer + sources
8. Frontend renders the assistant message with clickable source citations

## Mock Mode

When `MOCK_KB=true`:
- The `/api/chat` endpoint returns mock data instead of calling AWS
- Useful for testing the UI without AWS credentials or costs
- Simulates a 1.5-second delay to mimic real RAG latency

To enable mock mode:
```
MOCK_KB=true
```

## File Structure

```
.
├── client/                 # Frontend React app
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── components/    # Reusable components
│   │   ├── hooks/         # Custom React hooks
│   │   └── App.tsx        # Main app component
├── server/                # Backend Express app
│   ├── routes.ts          # API route handlers
│   ├── bedrock.ts         # AWS Bedrock integration
│   ├── storage.ts         # Database layer
│   ├── db.ts              # Database connection
│   └── index.ts           # Server entry point
├── shared/                # Shared types and schemas
│   ├── schema.ts          # Drizzle ORM schemas
│   └── routes.ts          # API route definitions
└── package.json
```

## Development

### Local testing with mock mode:
```bash
MOCK_KB=true npm run dev
```

### With real AWS (after configuring secrets):
```bash
MOCK_KB=false npm run dev
```

## Production

To build and deploy:
```bash
npm run build
npm start
```

The application will be built to the `dist/` directory.

## Security Notes

- AWS credentials are never exposed to the client
- Session data is stored in PostgreSQL (not in-memory)
- Passwords are hashed using bcrypt
- All chat endpoints require authentication
- Users can only access their own workspace and conversations

## Troubleshooting

### Chat endpoint returns 401 Unauthorized
- Make sure you're logged in first
- Check that cookies are being sent (`-c` and `-b` flags with curl)

### Bedrock API errors
- Verify AWS credentials are correct in Secrets
- Check that BEDROCK_KB_ID and BEDROCK_MODEL_ARN match your AWS setup
- Ensure the IAM user has `bedrock:InvokeAgent` permission

### Empty responses from mock mode
- Ensure `MOCK_KB=true` is set
- Check server logs for errors

## License

MIT
