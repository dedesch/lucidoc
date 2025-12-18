import { z } from 'zod';
import { insertUserSchema, insertMessageSchema } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

export const api = {
  auth: {
    register: {
      method: 'POST' as const,
      path: '/api/auth/register',
      input: insertUserSchema,
      responses: {
        201: z.custom<any>(), // Returns User
        400: errorSchemas.validation,
      },
    },
    login: {
      method: 'POST' as const,
      path: '/api/auth/login',
      input: insertUserSchema,
      responses: {
        200: z.custom<any>(), // Returns User
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/auth/logout',
      responses: {
        200: z.void(),
      },
    },
    me: {
      method: 'GET' as const,
      path: '/api/me',
      responses: {
        200: z.custom<any>(), // Returns User or null
      },
    },
  },
  chat: {
    send: {
      method: 'POST' as const,
      path: '/api/chat',
      input: z.object({
        message: z.string().min(1),
        conversationId: z.number().optional(),
      }),
      responses: {
        200: z.custom<{
          userMessage: any;
          assistantMessage: any;
          conversationId: number;
        }>(),
        401: errorSchemas.unauthorized,
        500: errorSchemas.internal,
      },
    },
    history: {
      method: 'GET' as const,
      path: '/api/conversations/:id',
      responses: {
        200: z.custom<any>(), // Returns ConversationWithMessages
        404: errorSchemas.notFound,
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/conversations',
      responses: {
        200: z.array(z.custom<any>()), // Returns Conversation[]
      },
    },
  },
  workspace: {
    get: {
      method: 'GET' as const,
      path: '/api/workspace',
      responses: {
        200: z.custom<any>(), // Returns Workspace
      },
    },
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
