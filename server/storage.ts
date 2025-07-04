import {
  users,
  plans,
  aiModels,
  images,
  subscriptions,
  creditTransactions,
  systemSettings,
  apiKeys,
  type User,
  type UpsertUser,
  type Plan,
  type InsertPlan,
  type AiModel,
  type InsertAiModel,
  type Image,
  type InsertImage,
  type Subscription,
  type InsertSubscription,
  type CreditTransaction,
  type InsertCreditTransaction,
  type SystemSetting,
  type InsertSystemSetting,
  type ApiKey,
  type InsertApiKey,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, count, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Plan operations
  getPlans(): Promise<Plan[]>;
  getPlan(id: number): Promise<Plan | undefined>;
  createPlan(plan: InsertPlan): Promise<Plan>;
  updatePlan(id: number, plan: Partial<InsertPlan>): Promise<Plan>;
  deletePlan(id: number): Promise<void>;
  
  // AI Model operations
  getAiModels(): Promise<AiModel[]>;
  getActiveAiModels(): Promise<AiModel[]>;
  getAiModel(id: number): Promise<AiModel | undefined>;
  createAiModel(model: InsertAiModel): Promise<AiModel>;
  updateAiModel(id: number, model: Partial<InsertAiModel>): Promise<AiModel>;
  deleteAiModel(id: number): Promise<void>;
  
  // Image operations
  getUserImages(userId: string, limit?: number, offset?: number): Promise<Image[]>;
  getImage(id: number): Promise<Image | undefined>;
  createImage(image: InsertImage): Promise<Image>;
  updateImage(id: number, updates: Partial<InsertImage>): Promise<Image>;
  deleteImage(id: number): Promise<void>;
  toggleImageFavorite(id: number): Promise<Image>;
  
  // Credit operations
  getUserCredits(userId: string): Promise<number>;
  addCredits(userId: string, amount: number, description: string): Promise<void>;
  spendCredits(userId: string, amount: number, description: string, imageId?: number): Promise<boolean>;
  getCreditTransactions(userId: string, limit?: number): Promise<CreditTransaction[]>;
  
  // Subscription operations
  getUserSubscription(userId: string): Promise<Subscription | undefined>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: number, updates: Partial<InsertSubscription>): Promise<Subscription>;
  
  // Admin operations
  getAllUsers(limit?: number, offset?: number): Promise<User[]>;
  getUserCount(): Promise<number>;
  getActiveSubscriptionCount(): Promise<number>;
  getTotalImagesGenerated(): Promise<number>;
  getMonthlyRevenue(): Promise<number>;
  updateUserCredits(userId: string, credits: number): Promise<void>;
  updateUserPlan(userId: string, planId: number): Promise<void>;
  assignCreditsToUser(userId: string, amount: number, description: string): Promise<void>;
  
  // System settings operations
  getSystemSettings(): Promise<SystemSetting[]>;
  getSystemSetting(key: string): Promise<SystemSetting | undefined>;
  updateSystemSetting(key: string, value: string, description?: string): Promise<SystemSetting>;
  
  // API keys operations
  getApiKeys(): Promise<ApiKey[]>;
  getApiKey(id: number): Promise<ApiKey | undefined>;
  getApiKeyByProvider(provider: string): Promise<ApiKey | undefined>;
  createApiKey(apiKey: InsertApiKey): Promise<ApiKey>;
  updateApiKey(id: number, updates: Partial<InsertApiKey>): Promise<ApiKey>;
  deleteApiKey(id: number): Promise<void>;
  toggleApiKeyStatus(id: number): Promise<ApiKey>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Plan operations
  async getPlans(): Promise<Plan[]> {
    return await db.select().from(plans).where(eq(plans.isActive, true)).orderBy(plans.price);
  }

  async getPlan(id: number): Promise<Plan | undefined> {
    const [plan] = await db.select().from(plans).where(eq(plans.id, id));
    return plan;
  }

  async createPlan(plan: InsertPlan): Promise<Plan> {
    const [newPlan] = await db.insert(plans).values(plan).returning();
    return newPlan;
  }

  async updatePlan(id: number, plan: Partial<InsertPlan>): Promise<Plan> {
    const [updatedPlan] = await db
      .update(plans)
      .set(plan)
      .where(eq(plans.id, id))
      .returning();
    return updatedPlan;
  }

  async deletePlan(id: number): Promise<void> {
    await db.update(plans).set({ isActive: false }).where(eq(plans.id, id));
  }

  // AI Model operations
  async getAiModels(): Promise<AiModel[]> {
    return await db.select().from(aiModels).orderBy(aiModels.creditCost);
  }

  async getActiveAiModels(): Promise<AiModel[]> {
    return await db.select().from(aiModels).where(eq(aiModels.isActive, true)).orderBy(aiModels.creditCost);
  }

  async getAiModel(id: number): Promise<AiModel | undefined> {
    const [model] = await db.select().from(aiModels).where(eq(aiModels.id, id));
    return model;
  }

  async createAiModel(model: InsertAiModel): Promise<AiModel> {
    const [newModel] = await db.insert(aiModels).values(model).returning();
    return newModel;
  }

  async updateAiModel(id: number, model: Partial<InsertAiModel>): Promise<AiModel> {
    const [updatedModel] = await db
      .update(aiModels)
      .set(model)
      .where(eq(aiModels.id, id))
      .returning();
    return updatedModel;
  }

  async deleteAiModel(id: number): Promise<void> {
    await db.update(aiModels).set({ isActive: false }).where(eq(aiModels.id, id));
  }

  // Image operations
  async getUserImages(userId: string, limit = 20, offset = 0): Promise<Image[]> {
    return await db
      .select()
      .from(images)
      .where(eq(images.userId, userId))
      .orderBy(desc(images.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getImage(id: number): Promise<Image | undefined> {
    const [image] = await db.select().from(images).where(eq(images.id, id));
    return image;
  }

  async createImage(image: InsertImage): Promise<Image> {
    const [newImage] = await db.insert(images).values(image).returning();
    return newImage;
  }

  async updateImage(id: number, updates: Partial<InsertImage>): Promise<Image> {
    const [updatedImage] = await db
      .update(images)
      .set(updates)
      .where(eq(images.id, id))
      .returning();
    return updatedImage;
  }

  async deleteImage(id: number): Promise<void> {
    await db.delete(images).where(eq(images.id, id)).execute();
  }

  async toggleImageFavorite(id: number): Promise<Image> {
    const [image] = await db.select().from(images).where(eq(images.id, id));
    const [updatedImage] = await db
      .update(images)
      .set({ isFavorite: !image.isFavorite })
      .where(eq(images.id, id))
      .returning();
    return updatedImage;
  }

  // Credit operations
  async getUserCredits(userId: string): Promise<number> {
    const [user] = await db.select({ credits: users.credits }).from(users).where(eq(users.id, userId));
    return user?.credits || 0;
  }

  async addCredits(userId: string, amount: number, description: string): Promise<void> {
    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ credits: sql`${users.credits} + ${amount}` })
        .where(eq(users.id, userId));

      await tx.insert(creditTransactions).values({
        userId,
        type: "earned",
        amount,
        description,
      });
    });
  }

  async spendCredits(userId: string, amount: number, description: string, imageId?: number): Promise<boolean> {
    const userCredits = await this.getUserCredits(userId);
    if (userCredits < amount) {
      return false;
    }

    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ credits: sql`${users.credits} - ${amount}` })
        .where(eq(users.id, userId));

      await tx.insert(creditTransactions).values({
        userId,
        type: "spent",
        amount: -amount,
        description,
        imageId,
      });
    });

    return true;
  }

  async getCreditTransactions(userId: string, limit = 20): Promise<CreditTransaction[]> {
    return await db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.userId, userId))
      .orderBy(desc(creditTransactions.createdAt))
      .limit(limit);
  }

  // Subscription operations
  async getUserSubscription(userId: string): Promise<Subscription | undefined> {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.status, "active"),
          gte(subscriptions.currentPeriodEnd, new Date())
        )
      );
    return subscription;
  }

  async createSubscription(subscription: InsertSubscription): Promise<Subscription> {
    const [newSubscription] = await db.insert(subscriptions).values(subscription).returning();
    return newSubscription;
  }

  async updateSubscription(id: number, updates: Partial<InsertSubscription>): Promise<Subscription> {
    const [updatedSubscription] = await db
      .update(subscriptions)
      .set(updates)
      .where(eq(subscriptions.id, id))
      .returning();
    return updatedSubscription;
  }

  // Admin operations
  async getAllUsers(limit = 50, offset = 0): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getUserCount(): Promise<number> {
    const [result] = await db.select({ count: count() }).from(users);
    return result.count;
  }

  async getActiveSubscriptionCount(): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.status, "active"),
          gte(subscriptions.currentPeriodEnd, new Date())
        )
      );
    return result.count;
  }

  async getTotalImagesGenerated(): Promise<number> {
    const [result] = await db.select({ count: count() }).from(images);
    return result.count;
  }

  async getMonthlyRevenue(): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);

    const [result] = await db
      .select({ 
        revenue: sql<number>`COALESCE(SUM(CAST(${plans.price} AS DECIMAL)), 0)` 
      })
      .from(subscriptions)
      .innerJoin(plans, eq(subscriptions.planId, plans.id))
      .where(
        and(
          eq(subscriptions.status, "active"),
          gte(subscriptions.createdAt, startOfMonth),
          lte(subscriptions.createdAt, endOfMonth)
        )
      );

    return Number(result.revenue) || 0;
  }

  async updateUserCredits(userId: string, credits: number): Promise<void> {
    await db.update(users).set({ credits }).where(eq(users.id, userId));
  }

  async updateUserPlan(userId: string, planId: number): Promise<void> {
    await db.update(users).set({ planId }).where(eq(users.id, userId));
  }

  async assignCreditsToUser(userId: string, amount: number, description: string): Promise<void> {
    await db.transaction(async (tx) => {
      // Update user credits
      const [user] = await tx.select().from(users).where(eq(users.id, userId));
      const newCredits = (user?.credits || 0) + amount;
      await tx.update(users).set({ credits: newCredits }).where(eq(users.id, userId));
      
      // Record transaction
      await tx.insert(creditTransactions).values({
        userId,
        type: amount > 0 ? 'earned' : 'spent',
        amount: Math.abs(amount),
        description,
      });
    });
  }

  // System settings operations
  async getSystemSettings(): Promise<SystemSetting[]> {
    return await db.select().from(systemSettings);
  }

  async getSystemSetting(key: string): Promise<SystemSetting | undefined> {
    const [setting] = await db.select().from(systemSettings).where(eq(systemSettings.key, key));
    return setting;
  }

  async updateSystemSetting(key: string, value: string, description?: string): Promise<SystemSetting> {
    const [setting] = await db
      .insert(systemSettings)
      .values({ key, value, description })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: { value, description, updatedAt: new Date() },
      })
      .returning();
    return setting;
  }

  // API keys operations
  async getApiKeys(): Promise<ApiKey[]> {
    return await db.select().from(apiKeys);
  }

  async getApiKey(id: number): Promise<ApiKey | undefined> {
    const [apiKey] = await db.select().from(apiKeys).where(eq(apiKeys.id, id));
    return apiKey;
  }

  async getApiKeyByProvider(provider: string): Promise<ApiKey | undefined> {
    const [apiKey] = await db.select().from(apiKeys).where(eq(apiKeys.provider, provider));
    return apiKey;
  }

  async createApiKey(apiKey: InsertApiKey): Promise<ApiKey> {
    const [newApiKey] = await db.insert(apiKeys).values(apiKey).returning();
    return newApiKey;
  }

  async updateApiKey(id: number, updates: Partial<InsertApiKey>): Promise<ApiKey> {
    const [updatedApiKey] = await db
      .update(apiKeys)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(apiKeys.id, id))
      .returning();
    return updatedApiKey;
  }

  async deleteApiKey(id: number): Promise<void> {
    await db.delete(apiKeys).where(eq(apiKeys.id, id));
  }

  async toggleApiKeyStatus(id: number): Promise<ApiKey> {
    const [apiKey] = await db.select().from(apiKeys).where(eq(apiKeys.id, id));
    const [updatedApiKey] = await db
      .update(apiKeys)
      .set({ isActive: !apiKey.isActive, updatedAt: new Date() })
      .where(eq(apiKeys.id, id))
      .returning();
    return updatedApiKey;
  }
}

export const storage = new DatabaseStorage();
