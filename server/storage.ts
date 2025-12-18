import { 
  users, workspaces, conversations, messages, sources,
  type User, type InsertUser, type Workspace, type Conversation, type Message, type InsertMessage, type Source, type InsertWorkspace
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // User
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Workspace
  getWorkspace(id: number): Promise<Workspace | undefined>;
  getWorkspaceByUserId(userId: number): Promise<Workspace | undefined>;
  createWorkspace(workspace: InsertWorkspace): Promise<Workspace>;

  // Conversation
  getConversation(id: number): Promise<Conversation | undefined>;
  getConversations(workspaceId: number): Promise<Conversation[]>;
  createConversation(userId: number, title: string): Promise<Conversation>;

  // Message
  getMessages(conversationId: number): Promise<(Message & { sources: Source[] })[]>;
  createMessage(message: InsertMessage, sources?: { title: string; url?: string; score?: number }[]): Promise<Message & { sources: Source[] }>;
  
  sessionStore: any;
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    this.sessionStore = undefined; // Initialized in routes
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getWorkspace(id: number): Promise<Workspace | undefined> {
    const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, id));
    return workspace;
  }

  async getWorkspaceByUserId(userId: number): Promise<Workspace | undefined> {
    const [workspace] = await db.select().from(workspaces).where(eq(workspaces.userId, userId));
    return workspace;
  }

  async createWorkspace(insertWorkspace: InsertWorkspace): Promise<Workspace> {
    const [workspace] = await db.insert(workspaces).values(insertWorkspace).returning();
    return workspace;
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation;
  }

  async getConversations(workspaceId: number): Promise<Conversation[]> {
    return await db.select().from(conversations)
      .where(eq(conversations.workspaceId, workspaceId))
      .orderBy(desc(conversations.createdAt));
  }

  async createConversation(userId: number, title: string): Promise<Conversation> {
    const workspace = await this.getWorkspaceByUserId(userId);
    if (!workspace) throw new Error("User has no workspace");

    const [conversation] = await db.insert(conversations).values({
      workspaceId: workspace.id,
      title: title
    }).returning();
    return conversation;
  }

  async getMessages(conversationId: number): Promise<(Message & { sources: Source[] })[]> {
    const msgs = await db.select().from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
    
    // Fetch sources for each message
    // In a real app, use a join. For MVP simplicity with Drizzle/Zod types, loop or Promise.all is fine.
    // Or simpler: just fetch all sources for these messages.
    
    const result: (Message & { sources: Source[] })[] = [];
    
    for (const msg of msgs) {
      const srcList = await db.select().from(sources).where(eq(sources.messageId, msg.id));
      result.push({ ...msg, sources: srcList });
    }
    
    return result;
  }

  async createMessage(insertMessage: InsertMessage, sourceList?: { title: string; url?: string; score?: number }[]): Promise<Message & { sources: Source[] }> {
    const [message] = await db.insert(messages).values(insertMessage).returning();
    
    const createdSources: Source[] = [];
    if (sourceList && sourceList.length > 0) {
      for (const src of sourceList) {
        const [s] = await db.insert(sources).values({
          messageId: message.id,
          title: src.title,
          url: src.url,
          score: src.score
        }).returning();
        createdSources.push(s);
      }
    }
    
    return { ...message, sources: createdSources };
  }
}

export const storage = new DatabaseStorage();
