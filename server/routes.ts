import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api, errorSchemas } from "@shared/routes";
import { z } from "zod";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import { sources } from "@shared/schema";
import { queryBedrock } from "./bedrock";

const PgSession = connectPgSimple(session);

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // === AUTH SETUP ===
  // Determine if we're on a secure domain (development or published)
  const isSecureDomain = app.get('env') === 'production' || !!process.env.REPLIT_DOMAINS;
  
  app.use(session({
    store: new PgSession({
      pool,
      tableName: 'session'
    }),
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      secure: isSecureDomain,
      httpOnly: true,
      sameSite: 'lax'
    }
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(new LocalStrategy({
    usernameField: 'email'
  }, async (email, password, done) => {
    try {
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return done(null, false, { message: 'Incorrect email.' });
      }
      if (!await bcrypt.compare(password, user.password)) {
        return done(null, false, { message: 'Incorrect password.' });
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }));

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  const isAuthenticated = (req: any, res: any, next: any) => {
    if (req.isAuthenticated()) return next();
    res.status(401).json({ message: "Unauthorized" });
  };

  // === API ROUTES ===

  // Auth Routes
  app.post(api.auth.register.path, async (req, res) => {
    try {
      const input = api.auth.register.input.parse(req.body);
      const existingUser = await storage.getUserByEmail(input.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }

      const hashedPassword = await bcrypt.hash(input.password, 10);
      const user = await storage.createUser({ ...input, password: hashedPassword });
      
      // Create default workspace
      await storage.createWorkspace({
        userId: user.id,
        name: `${input.email.split('@')[0]}'s Workspace`
      });

      req.login(user, (err) => {
        if (err) throw err;
        res.status(201).json(user);
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(500).json({ message: "Internal Server Error" });
      }
    }
  });

  app.post(api.auth.login.path, passport.authenticate('local'), (req, res) => {
    res.json(req.user);
  });

  app.post(api.auth.logout.path, (req, res) => {
    req.logout((err) => {
      if (err) return res.status(500).json({ message: "Logout failed" });
      res.sendStatus(200);
    });
  });

  app.get(api.auth.me.path, (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });

  // Chat Routes
  app.post(api.chat.send.path, isAuthenticated, async (req, res) => {
    try {
      const { message, conversationId } = api.chat.send.input.parse(req.body);
      const user = req.user as any;

      let convId = conversationId;
      if (!convId) {
        // Create new conversation
        const conv = await storage.createConversation(user.id, message.substring(0, 30) + "...");
        convId = conv.id;
      } else {
        // Verify ownership
        const conv = await storage.getConversation(convId);
        if (!conv) return res.status(404).json({ message: "Conversation not found" });
        const workspace = await storage.getWorkspace(conv.workspaceId);
        if (workspace?.userId !== user.id) return res.status(403).json({ message: "Forbidden" });
      }

      // Store User Message
      const userMsg = await storage.createMessage({
        conversationId: convId!,
        role: "user",
        content: message
      });

      // Query Bedrock Knowledge Base (or mock if MOCK_KB=true)
      const ragResult = await queryBedrock(message);
      const aiResponseText = ragResult.answer;
      const aiSources = ragResult.sources;

      // Store AI Message
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

  app.get(api.chat.history.path, isAuthenticated, async (req, res) => {
    const user = req.user as any;
    const convId = parseInt(req.params.id);
    const conv = await storage.getConversation(convId);
    
    if (!conv) return res.status(404).json({ message: "Conversation not found" });
    
    // Check ownership
    const workspace = await storage.getWorkspace(conv.workspaceId);
    if (workspace?.userId !== user.id) return res.status(403).json({ message: "Forbidden" });

    const messages = await storage.getMessages(convId);
    res.json({ ...conv, messages });
  });

  app.get(api.chat.list.path, isAuthenticated, async (req, res) => {
    const user = req.user as any;
    const workspace = await storage.getWorkspaceByUserId(user.id);
    if (!workspace) return res.json([]);
    
    const conversations = await storage.getConversations(workspace.id);
    res.json(conversations);
  });

  app.get(api.workspace.get.path, isAuthenticated, async (req, res) => {
    const user = req.user as any;
    const workspace = await storage.getWorkspaceByUserId(user.id);
    res.json(workspace);
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
      const result = await queryBedrock("test query", kbId, modelArn);
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
