import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api, errorSchemas } from "@shared/routes";
import { z } from "zod";
import cookieParser from "cookie-parser";
import { pool, db } from "./db";
import { sources, users } from "@shared/schema";
import { queryBedrock } from "./bedrock";
import { 
  cognitoRegister, 
  cognitoConfirmSignUp, 
  cognitoLogin, 
  cognitoGetUser,
  getCognitoConfig
} from "./cognito";
import { verifyIdToken, type CognitoJWTPayload } from "./jwt-verify";

interface AuthenticatedRequest extends Request {
  cognitoUser?: {
    userId: string;
    email: string;
    tenantId: string;
  };
  localUser?: {
    id: number;
    email: string;
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  const isProduction = process.env.NODE_ENV === 'production' || !!process.env.REPLIT_DOMAINS;
  
  app.use(cookieParser());

  const isAuthenticated = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const token = req.cookies?.lucidoc_token || req.headers.authorization?.replace("Bearer ", "");
    
    if (!token) {
      return res.status(401).json({ message: "No authentication token provided" });
    }

    try {
      const payload = await verifyIdToken(token);
      
      req.cognitoUser = {
        userId: payload.sub,
        email: payload.email || payload["cognito:username"] || "",
        tenantId: payload.sub,
      };

      const localUser = await storage.getUserByEmail(req.cognitoUser.email);
      if (localUser) {
        req.localUser = { id: localUser.id, email: localUser.email };
      }
      
      next();
    } catch (error) {
      console.error("Auth error:", error instanceof Error ? error.message : error);
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  };

  // === AUTH ROUTES (Cognito) ===

  app.post(api.auth.register.path, async (req, res) => {
    try {
      const input = api.auth.register.input.parse(req.body);
      const normalizedEmail = input.email.toLowerCase().trim();

      const result = await cognitoRegister(normalizedEmail, input.password);
      
      if (result.userConfirmed) {
        const tokens = await cognitoLogin(normalizedEmail, input.password);
        
        let localUser = await storage.getUserByEmail(normalizedEmail);
        if (!localUser) {
          localUser = await storage.createUser({ 
            email: normalizedEmail, 
            password: "cognito-managed" 
          });
          await storage.createWorkspace({
            userId: localUser.id,
            name: `${normalizedEmail.split('@')[0]}'s Workspace`
          });
        }

        res.cookie("lucidoc_token", tokens.idToken, {
          httpOnly: true,
          secure: isProduction,
          sameSite: "lax",
          maxAge: tokens.expiresIn * 1000,
        });

        res.cookie("lucidoc_access_token", tokens.accessToken, {
          httpOnly: true,
          secure: isProduction,
          sameSite: "lax",
          maxAge: tokens.expiresIn * 1000,
        });

        res.status(201).json({ 
          id: localUser.id, 
          email: localUser.email,
          confirmed: true 
        });
      } else {
        res.status(201).json({ 
          email: normalizedEmail,
          username: result.username,
          confirmed: false,
          message: "Please check your email for a verification code" 
        });
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      
      if (err.name === "UsernameExistsException") {
        return res.status(400).json({ message: "An account with this email already exists" });
      }
      if (err.name === "InvalidPasswordException") {
        return res.status(400).json({ message: "Password does not meet requirements (min 8 chars, uppercase, lowercase, number)" });
      }
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      
      res.status(500).json({ message: err.message || "Registration failed" });
    }
  });

  app.post("/api/auth/confirm", async (req, res) => {
    try {
      const { username, code } = req.body;
      
      if (!username || !code) {
        return res.status(400).json({ message: "Username and confirmation code are required" });
      }

      await cognitoConfirmSignUp(username, code);
      
      res.json({ message: "Email confirmed successfully. You can now log in." });
    } catch (err: any) {
      console.error('Confirm error:', err);
      
      if (err.name === "CodeMismatchException") {
        return res.status(400).json({ message: "Invalid confirmation code" });
      }
      if (err.name === "ExpiredCodeException") {
        return res.status(400).json({ message: "Confirmation code has expired" });
      }
      
      res.status(500).json({ message: err.message || "Confirmation failed" });
    }
  });

  app.post(api.auth.login.path, async (req, res) => {
    try {
      const input = api.auth.login.input.parse(req.body);
      const normalizedEmail = input.email.toLowerCase().trim();

      const tokens = await cognitoLogin(normalizedEmail, input.password);
      
      let localUser = await storage.getUserByEmail(normalizedEmail);
      if (!localUser) {
        localUser = await storage.createUser({ 
          email: normalizedEmail, 
          password: "cognito-managed" 
        });
        await storage.createWorkspace({
          userId: localUser.id,
          name: `${normalizedEmail.split('@')[0]}'s Workspace`
        });
      }

      res.cookie("lucidoc_token", tokens.idToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        maxAge: tokens.expiresIn * 1000,
      });

      res.cookie("lucidoc_access_token", tokens.accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        maxAge: tokens.expiresIn * 1000,
      });

      if (tokens.refreshToken) {
        res.cookie("lucidoc_refresh_token", tokens.refreshToken, {
          httpOnly: true,
          secure: isProduction,
          sameSite: "lax",
          maxAge: 30 * 24 * 60 * 60 * 1000,
        });
      }

      res.json({ id: localUser.id, email: localUser.email });
    } catch (err: any) {
      console.error('Login error:', err);
      
      if (err.name === "NotAuthorizedException") {
        return res.status(401).json({ message: "Incorrect email or password" });
      }
      if (err.name === "UserNotConfirmedException") {
        return res.status(400).json({ 
          message: "Please confirm your email address first",
          needsConfirmation: true 
        });
      }
      if (err.name === "UserNotFoundException") {
        return res.status(401).json({ message: "Incorrect email or password" });
      }
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      
      res.status(500).json({ message: err.message || "Login failed" });
    }
  });

  app.post(api.auth.logout.path, (req, res) => {
    res.clearCookie("lucidoc_token");
    res.clearCookie("lucidoc_access_token");
    res.clearCookie("lucidoc_refresh_token");
    res.sendStatus(200);
  });

  app.get(api.auth.me.path, isAuthenticated, async (req: AuthenticatedRequest, res) => {
    if (!req.cognitoUser) {
      return res.sendStatus(401);
    }
    
    const localUser = req.localUser || await storage.getUserByEmail(req.cognitoUser.email);
    
    res.json({
      id: localUser?.id || 0,
      email: req.cognitoUser.email,
      cognitoUserId: req.cognitoUser.userId,
      tenantId: req.cognitoUser.tenantId,
    });
  });

  // === CHAT ROUTES ===

  app.post(api.chat.send.path, isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const { message, conversationId } = api.chat.send.input.parse(req.body);
      
      if (!req.localUser) {
        return res.status(401).json({ message: "User not found" });
      }
      
      const userId = req.localUser.id;
      const tenantId = req.cognitoUser?.tenantId || String(userId);

      let convId = conversationId;
      if (!convId) {
        const conv = await storage.createConversation(userId, message.substring(0, 30) + "...");
        convId = conv.id;
      } else {
        const conv = await storage.getConversation(convId);
        if (!conv) return res.status(404).json({ message: "Conversation not found" });
        const workspace = await storage.getWorkspace(conv.workspaceId);
        if (workspace?.userId !== userId) return res.status(403).json({ message: "Forbidden" });
      }

      const userMsg = await storage.createMessage({
        conversationId: convId!,
        role: "user",
        content: message
      });

      console.log(`[Chat] tenant=${tenantId} user=${userId} conv=${convId}`);
      
      const ragResult = await queryBedrock(message);
      const aiResponseText = ragResult.answer;
      const aiSources = ragResult.sources;

      const aiMsg = await storage.createMessage({
        conversationId: convId!,
        role: "assistant",
        content: aiResponseText
      }, aiSources);

      res.json({
        userMessage: userMsg,
        assistantMessage: aiMsg,
        conversationId: convId
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to process message" });
    }
  });

  app.get(api.chat.history.path, isAuthenticated, async (req: AuthenticatedRequest, res) => {
    if (!req.localUser) return res.status(401).json({ message: "User not found" });
    
    const userId = req.localUser.id;
    const convId = parseInt(req.params.id);
    const conv = await storage.getConversation(convId);
    
    if (!conv) return res.status(404).json({ message: "Conversation not found" });
    
    const workspace = await storage.getWorkspace(conv.workspaceId);
    if (workspace?.userId !== userId) return res.status(403).json({ message: "Forbidden" });

    const messages = await storage.getMessages(convId);
    res.json({ ...conv, messages });
  });

  app.get(api.chat.list.path, isAuthenticated, async (req: AuthenticatedRequest, res) => {
    if (!req.localUser) return res.status(401).json({ message: "User not found" });
    
    const workspace = await storage.getWorkspaceByUserId(req.localUser.id);
    if (!workspace) return res.json([]);
    
    const conversations = await storage.getConversations(workspace.id);
    res.json(conversations);
  });

  app.get(api.workspace.get.path, isAuthenticated, async (req: AuthenticatedRequest, res) => {
    if (!req.localUser) return res.status(401).json({ message: "User not found" });
    
    const workspace = await storage.getWorkspaceByUserId(req.localUser.id);
    res.json(workspace);
  });

  // === HEALTH CHECK ENDPOINT ===
  app.get("/api/health", async (req, res) => {
    let dbStatus = "unknown";
    let userCount = 0;
    try {
      const result = await db.select().from(users);
      dbStatus = "connected";
      userCount = result.length;
    } catch (e) {
      dbStatus = "error: " + (e instanceof Error ? e.message : String(e));
    }

    const cognitoConfig = getCognitoConfig();

    res.json({
      status: "ok",
      version: "2025-01-09-v1-bedrock-fix",
      auth: "cognito",
      cognitoConfigured: cognitoConfig.configured,
      mockKb: process.env.MOCK_KB,
      hasAwsCreds: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
      hasKbConfig: !!(process.env.BEDROCK_KB_ID && process.env.BEDROCK_MODEL_ARN),
      region: process.env.AWS_REGION,
      dbStatus,
      userCount,
      dbHost: process.env.PGHOST ? process.env.PGHOST.substring(0, 20) + "..." : "not set"
    });
  });

  // === BEDROCK TEST ENDPOINT ===
  app.get("/api/bedrock-test", isAuthenticated, async (req, res) => {
    const mockKb = process.env.MOCK_KB === 'true';
    
    if (mockKb) {
      return res.json({
        status: "mock mode",
        message: "MOCK_KB is set to true. Switch to false to test real Bedrock."
      });
    }

    const kbId = process.env.BEDROCK_KB_ID;
    const modelArn = process.env.BEDROCK_MODEL_ARN;
    const region = process.env.AWS_REGION;

    if (!kbId || !modelArn || !region) {
      return res.json({
        status: "error",
        message: "Missing BEDROCK_KB_ID, BEDROCK_MODEL_ARN, or AWS_REGION",
        kbId: !!kbId,
        modelArn: !!modelArn,
        region: !!region
      });
    }

    try {
      const result = await queryBedrock("What is this knowledge base about?");
      res.json({
        status: "success",
        message: "Bedrock connection works!",
        modelUsed: modelArn,
        region,
        kbId,
        result
      });
    } catch (error: any) {
      res.json({
        status: "error",
        message: error.message,
        errorCode: error.$fault,
        modelArn,
        region,
        kbId,
        httpStatusCode: error.$metadata?.httpStatusCode
      });
    }
  });

  return httpServer;
}
