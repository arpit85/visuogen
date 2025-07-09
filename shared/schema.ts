import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
  decimal,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table with email authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email").unique().notNull(),
  password: varchar("password").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  credits: integer("credits").default(10).notNull(),
  planId: integer("plan_id"),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  isAdmin: boolean("is_admin").default(false).notNull(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Password reset tokens
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Subscription plans
export const plans = pgTable("plans", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  creditsPerMonth: integer("credits_per_month").notNull(),
  features: jsonb("features").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Plan-AI Model associations (which models are available for each plan)
export const planAiModels = pgTable("plan_ai_models", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").notNull().references(() => plans.id, { onDelete: "cascade" }),
  aiModelId: integer("ai_model_id").notNull().references(() => aiModels.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

// AI Models
export const aiModels = pgTable("ai_models", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),
  provider: varchar("provider").notNull(), // openai, piapi, stability, runware
  creditCost: integer("credit_cost").notNull(),
  maxResolution: varchar("max_resolution"),
  averageGenerationTime: integer("average_generation_time"), // in seconds
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Generated images
export const images = pgTable("images", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  modelId: integer("model_id").notNull(),
  prompt: text("prompt").notNull(),
  imageUrl: text("image_url").notNull(),
  settings: jsonb("settings"), // size, style, quality, etc.
  isFavorite: boolean("is_favorite").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// User subscriptions
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  planId: integer("plan_id").notNull(),
  status: varchar("status").notNull(), // active, cancelled, expired
  currentPeriodStart: timestamp("current_period_start").notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Credit transactions
export const creditTransactions = pgTable("credit_transactions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  type: varchar("type").notNull(), // earned, spent, refunded
  amount: integer("amount").notNull(),
  description: text("description"),
  imageId: integer("image_id"), // if spent on image generation
  createdAt: timestamp("created_at").defaultNow(),
});

// System settings table for storing configuration
export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  key: varchar("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// API keys table for storing encrypted API keys
export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  provider: varchar("provider").notNull(), // 'openai', 'piapi', 'stability', 'replicate'
  name: varchar("name").notNull(),
  keyValue: text("key_value").notNull(), // encrypted
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Image sharing table
export const imageShares = pgTable("image_shares", {
  id: serial("id").primaryKey(),
  imageId: integer("image_id").notNull().references(() => images.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  shareToken: varchar("share_token", { length: 64 }).notNull().unique(),
  isPublic: boolean("is_public").default(false),
  allowDownload: boolean("allow_download").default(true),
  allowComments: boolean("allow_comments").default(true),
  expiresAt: timestamp("expires_at"),
  views: integer("views").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Batch generation jobs
export const batchJobs = pgTable("batch_jobs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, processing, completed, failed, cancelled
  totalImages: integer("total_images").notNull(),
  completedImages: integer("completed_images").default(0),
  failedImages: integer("failed_images").default(0),
  modelId: integer("model_id").notNull().references(() => aiModels.id),
  creditsUsed: integer("credits_used").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Batch generation items (individual prompts in a batch)
export const batchItems = pgTable("batch_items", {
  id: serial("id").primaryKey(),
  batchJobId: integer("batch_job_id").notNull().references(() => batchJobs.id, { onDelete: "cascade" }),
  prompt: text("prompt").notNull(),
  settings: jsonb("settings"), // size, quality, style etc.
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, processing, completed, failed
  imageId: integer("image_id").references(() => images.id),
  errorMessage: text("error_message"),
  processingOrder: integer("processing_order").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Image collections for organizing shared images
export const collections = pgTable("collections", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  isPublic: boolean("is_public").default(false),
  shareToken: varchar("share_token", { length: 64 }).unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Collection items
export const collectionItems = pgTable("collection_items", {
  id: serial("id").primaryKey(),
  collectionId: integer("collection_id").notNull().references(() => collections.id, { onDelete: "cascade" }),
  imageId: integer("image_id").notNull().references(() => images.id, { onDelete: "cascade" }),
  addedAt: timestamp("added_at").defaultNow(),
});

// Comments on shared images
export const imageComments = pgTable("image_comments", {
  id: serial("id").primaryKey(),
  imageId: integer("image_id").notNull().references(() => images.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  guestName: varchar("guest_name", { length: 100 }),
  guestEmail: varchar("guest_email", { length: 255 }),
  content: text("content").notNull(),
  isApproved: boolean("is_approved").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Collaboration invites
export const collaborationInvites = pgTable("collaboration_invites", {
  id: serial("id").primaryKey(),
  fromUserId: varchar("from_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  toEmail: varchar("to_email", { length: 255 }).notNull(),
  imageId: integer("image_id").references(() => images.id, { onDelete: "cascade" }),
  collectionId: integer("collection_id").references(() => collections.id, { onDelete: "cascade" }),
  permissions: varchar("permissions", { length: 20 }).notNull(), // 'view', 'comment', 'edit'
  token: varchar("token", { length: 64 }).notNull().unique(),
  status: varchar("status", { length: 20 }).default("pending"), // 'pending', 'accepted', 'declined'
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Bad words filter for prompt content moderation
export const badWords = pgTable("bad_words", {
  id: serial("id").primaryKey(),
  word: varchar("word", { length: 100 }).notNull().unique(),
  severity: varchar("severity", { length: 20 }).notNull().default("moderate"), // 'mild', 'moderate', 'severe'
  isActive: boolean("is_active").default(true).notNull(),
  addedBy: integer("added_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Coupons for lifetime subscriptions and promotions
export const coupons = pgTable("coupons", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  type: varchar("type", { length: 20 }).notNull(), // 'lifetime', 'credits', 'plan_upgrade'
  planId: integer("plan_id").references(() => plans.id), // for lifetime/plan_upgrade coupons
  creditAmount: integer("credit_amount"), // for credit coupons
  description: text("description"),
  maxUses: integer("max_uses").default(1), // null = unlimited
  currentUses: integer("current_uses").default(0),
  isActive: boolean("is_active").default(true).notNull(),
  expiresAt: timestamp("expires_at"), // null = never expires
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Coupon redemptions tracking
export const couponRedemptions = pgTable("coupon_redemptions", {
  id: serial("id").primaryKey(),
  couponId: integer("coupon_id").notNull().references(() => coupons.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  redeemedAt: timestamp("redeemed_at").defaultNow(),
  ipAddress: varchar("ip_address", { length: 45 }), // for tracking
});

// Bulk coupon generation jobs
export const couponBatches = pgTable("coupon_batches", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(), // 'lifetime', 'credits', 'plan_upgrade'
  planId: integer("plan_id").references(() => plans.id),
  creditAmount: integer("credit_amount"),
  quantity: integer("quantity").notNull(),
  generatedCount: integer("generated_count").default(0),
  prefix: varchar("prefix", { length: 20 }), // optional prefix for codes
  expiresAt: timestamp("expires_at"),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, generating, completed, failed
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  plan: one(plans, { fields: [users.planId], references: [plans.id] }),
  images: many(images),
  subscriptions: many(subscriptions),
  creditTransactions: many(creditTransactions),
  imageShares: many(imageShares),
  collections: many(collections),
  imageComments: many(imageComments),
  sentInvites: many(collaborationInvites, { relationName: "sentInvites" }),
  createdCoupons: many(coupons),
  couponRedemptions: many(couponRedemptions),
  createdCouponBatches: many(couponBatches),
}));

export const plansRelations = relations(plans, ({ many }) => ({
  users: many(users),
  subscriptions: many(subscriptions),
  planAiModels: many(planAiModels),
}));

export const planAiModelsRelations = relations(planAiModels, ({ one }) => ({
  plan: one(plans, { fields: [planAiModels.planId], references: [plans.id] }),
  aiModel: one(aiModels, { fields: [planAiModels.aiModelId], references: [aiModels.id] }),
}));

export const aiModelsRelations = relations(aiModels, ({ many }) => ({
  images: many(images),
  planAiModels: many(planAiModels),
}));

export const imagesRelations = relations(images, ({ one, many }) => ({
  user: one(users, { fields: [images.userId], references: [users.id] }),
  model: one(aiModels, { fields: [images.modelId], references: [aiModels.id] }),
  creditTransaction: one(creditTransactions, { fields: [images.id], references: [creditTransactions.imageId] }),
  shares: many(imageShares),
  comments: many(imageComments),
  collectionItems: many(collectionItems),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, { fields: [subscriptions.userId], references: [users.id] }),
  plan: one(plans, { fields: [subscriptions.planId], references: [plans.id] }),
}));

export const creditTransactionsRelations = relations(creditTransactions, ({ one }) => ({
  user: one(users, { fields: [creditTransactions.userId], references: [users.id] }),
  image: one(images, { fields: [creditTransactions.imageId], references: [images.id] }),
}));

// Sharing and collaboration relations
export const imageSharesRelations = relations(imageShares, ({ one }) => ({
  image: one(images, { fields: [imageShares.imageId], references: [images.id] }),
  user: one(users, { fields: [imageShares.userId], references: [users.id] }),
}));

export const collectionsRelations = relations(collections, ({ one, many }) => ({
  user: one(users, { fields: [collections.userId], references: [users.id] }),
  items: many(collectionItems),
}));

export const collectionItemsRelations = relations(collectionItems, ({ one }) => ({
  collection: one(collections, { fields: [collectionItems.collectionId], references: [collections.id] }),
  image: one(images, { fields: [collectionItems.imageId], references: [images.id] }),
}));

export const imageCommentsRelations = relations(imageComments, ({ one }) => ({
  image: one(images, { fields: [imageComments.imageId], references: [images.id] }),
  user: one(users, { fields: [imageComments.userId], references: [users.id] }),
}));

export const collaborationInvitesRelations = relations(collaborationInvites, ({ one }) => ({
  fromUser: one(users, { fields: [collaborationInvites.fromUserId], references: [users.id] }),
  image: one(images, { fields: [collaborationInvites.imageId], references: [images.id] }),
  collection: one(collections, { fields: [collaborationInvites.collectionId], references: [collections.id] }),
}));

export const badWordsRelations = relations(badWords, ({ one }) => ({
  addedByUser: one(users, { fields: [badWords.addedBy], references: [users.id] }),
}));

export const couponsRelations = relations(coupons, ({ one, many }) => ({
  plan: one(plans, { fields: [coupons.planId], references: [plans.id] }),
  createdByUser: one(users, { fields: [coupons.createdBy], references: [users.id] }),
  redemptions: many(couponRedemptions),
}));

export const couponRedemptionsRelations = relations(couponRedemptions, ({ one }) => ({
  coupon: one(coupons, { fields: [couponRedemptions.couponId], references: [coupons.id] }),
  user: one(users, { fields: [couponRedemptions.userId], references: [users.id] }),
}));

export const couponBatchesRelations = relations(couponBatches, ({ one }) => ({
  plan: one(plans, { fields: [couponBatches.planId], references: [plans.id] }),
  createdByUser: one(users, { fields: [couponBatches.createdBy], references: [users.id] }),
}));

export const batchJobsRelations = relations(batchJobs, ({ one, many }) => ({
  user: one(users, { fields: [batchJobs.userId], references: [users.id] }),
  model: one(aiModels, { fields: [batchJobs.modelId], references: [aiModels.id] }),
  items: many(batchItems),
}));

export const batchItemsRelations = relations(batchItems, ({ one }) => ({
  batchJob: one(batchJobs, { fields: [batchItems.batchJobId], references: [batchJobs.id] }),
  image: one(images, { fields: [batchItems.imageId], references: [images.id] }),
}));

// Insert schemas
export const insertPlanSchema = createInsertSchema(plans).omit({
  id: true,
  createdAt: true,
});

export const insertAiModelSchema = createInsertSchema(aiModels).omit({
  id: true,
  createdAt: true,
});

export const insertPlanAiModelSchema = createInsertSchema(planAiModels).omit({
  id: true,
  createdAt: true,
});

export const insertImageSchema = createInsertSchema(images).omit({
  id: true,
  createdAt: true,
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
});

export const insertCreditTransactionSchema = createInsertSchema(creditTransactions).omit({
  id: true,
  createdAt: true,
});

export const insertSystemSettingSchema = createInsertSchema(systemSettings).omit({
  id: true,
  updatedAt: true,
});

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBadWordSchema = createInsertSchema(badWords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  used: true,
  createdAt: true,
});

// Coupon insert schemas
export const insertCouponSchema = createInsertSchema(coupons).omit({
  id: true,
  currentUses: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCouponRedemptionSchema = createInsertSchema(couponRedemptions).omit({
  id: true,
  redeemedAt: true,
});

export const insertCouponBatchSchema = createInsertSchema(couponBatches).omit({
  id: true,
  generatedCount: true,
  status: true,
  createdAt: true,
  completedAt: true,
});

// Sharing and collaboration insert schemas
export const insertImageShareSchema = createInsertSchema(imageShares).omit({
  id: true,
  views: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCollectionSchema = createInsertSchema(collections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCollectionItemSchema = createInsertSchema(collectionItems).omit({
  id: true,
  addedAt: true,
});

export const insertImageCommentSchema = createInsertSchema(imageComments).omit({
  id: true,
  isApproved: true,
  createdAt: true,
});

export const insertCollaborationInviteSchema = createInsertSchema(collaborationInvites).omit({
  id: true,
  status: true,
  createdAt: true,
});

// Batch generation insert schemas
export const insertBatchJobSchema = createInsertSchema(batchJobs).omit({
  id: true,
  status: true,
  completedImages: true,
  failedImages: true,
  creditsUsed: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBatchItemSchema = createInsertSchema(batchItems).omit({
  id: true,
  status: true,
  imageId: true,
  errorMessage: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Plan = typeof plans.$inferSelect;
export type InsertPlan = z.infer<typeof insertPlanSchema>;
export type PlanAiModel = typeof planAiModels.$inferSelect;
export type InsertPlanAiModel = z.infer<typeof insertPlanAiModelSchema>;
export type AiModel = typeof aiModels.$inferSelect;
export type InsertAiModel = z.infer<typeof insertAiModelSchema>;
export type Image = typeof images.$inferSelect;
export type InsertImage = z.infer<typeof insertImageSchema>;
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type InsertCreditTransaction = z.infer<typeof insertCreditTransactionSchema>;
export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;
export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type BadWord = typeof badWords.$inferSelect;
export type InsertBadWord = z.infer<typeof insertBadWordSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;

// Coupon types
export type Coupon = typeof coupons.$inferSelect;
export type InsertCoupon = z.infer<typeof insertCouponSchema>;
export type CouponRedemption = typeof couponRedemptions.$inferSelect;
export type InsertCouponRedemption = z.infer<typeof insertCouponRedemptionSchema>;
export type CouponBatch = typeof couponBatches.$inferSelect;
export type InsertCouponBatch = z.infer<typeof insertCouponBatchSchema>;

// Sharing and collaboration types
export type ImageShare = typeof imageShares.$inferSelect;
export type InsertImageShare = z.infer<typeof insertImageShareSchema>;
export type Collection = typeof collections.$inferSelect;
export type InsertCollection = z.infer<typeof insertCollectionSchema>;
export type CollectionItem = typeof collectionItems.$inferSelect;
export type InsertCollectionItem = z.infer<typeof insertCollectionItemSchema>;
export type ImageComment = typeof imageComments.$inferSelect;
export type InsertImageComment = z.infer<typeof insertImageCommentSchema>;
export type CollaborationInvite = typeof collaborationInvites.$inferSelect;
export type InsertCollaborationInvite = z.infer<typeof insertCollaborationInviteSchema>;

// Batch generation types
export type BatchJob = typeof batchJobs.$inferSelect;
export type InsertBatchJob = z.infer<typeof insertBatchJobSchema>;
export type BatchItem = typeof batchItems.$inferSelect;
export type InsertBatchItem = z.infer<typeof insertBatchItemSchema>;

// Authentication schemas
export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signupSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});

export type LoginData = z.infer<typeof loginSchema>;
export type SignupData = z.infer<typeof signupSchema>;
