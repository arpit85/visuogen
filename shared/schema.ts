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
  emailNotifications: boolean("email_notifications").default(true).notNull(),
  lastLoginAt: timestamp("last_login_at"),
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
  isLifetime: boolean("is_lifetime").default(false).notNull(),
  lifetimeCredits: integer("lifetime_credits"), // Credits for lifetime plans
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
  provider: varchar("provider").notNull(), // openai, piapi, stability, replicate
  modelType: varchar("model_type").notNull().default("image"), // image, video
  creditCost: integer("credit_cost").notNull(),
  maxResolution: varchar("max_resolution"),
  averageGenerationTime: integer("average_generation_time"), // in seconds
  maxDuration: integer("max_duration"), // for video models, in seconds
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Generated videos
export const videos = pgTable("videos", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  modelId: integer("model_id").notNull(),
  prompt: text("prompt").notNull(),
  videoUrl: text("video_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  settings: jsonb("settings"), // duration, resolution, aspect_ratio, etc.
  duration: integer("duration"), // actual video duration in seconds
  resolution: varchar("resolution"), // 720p, 1080p, etc.
  fileSize: integer("file_size"), // in bytes
  status: varchar("status").default("completed").notNull(), // generating, completed, failed
  isFavorite: boolean("is_favorite").default(false).notNull(),
  isPublic: boolean("is_public").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Video sharing
export const videoShares = pgTable("video_shares", {
  id: serial("id").primaryKey(),
  videoId: integer("video_id").notNull().references(() => videos.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull(),
  shareToken: varchar("share_token").notNull().unique(),
  permissions: varchar("permissions").notNull().default("view"), // view, download, comment
  expiresAt: timestamp("expires_at"),
  viewCount: integer("view_count").default(0),
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

// User notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type").notNull(), // welcome, credit_low, image_generated, weekly_summary, etc.
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  data: jsonb("data"), // additional context data
  read: boolean("read").default(false).notNull(),
  emailSent: boolean("email_sent").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// User activity tracking
export const userActivities = pgTable("user_activities", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  action: varchar("action").notNull(), // login, image_generated, credit_purchased, etc.
  details: jsonb("details"), // additional context
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Email templates
export const emailTemplates = pgTable("email_templates", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull().unique(),
  subject: varchar("subject").notNull(),
  htmlContent: text("html_content").notNull(),
  textContent: text("text_content").notNull(),
  variables: jsonb("variables"), // template variables
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
  addedBy: varchar("added_by").notNull().references(() => users.id),
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
  batchId: integer("batch_id").references(() => couponBatches.id, { onDelete: "cascade" }), // for batch-generated coupons
  expiresAt: timestamp("expires_at"), // null = never expires
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Social media shares tracking
export const socialShares = pgTable("social_shares", {
  id: serial("id").primaryKey(),
  imageId: integer("image_id").notNull().references(() => images.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  platform: varchar("platform", { length: 50 }).notNull(), // 'twitter', 'facebook', 'instagram', etc.
  shareText: text("share_text"),
  hashtags: text("hashtags"), // comma-separated hashtags
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// SMTP configuration for email sending
export const smtpSettings = pgTable("smtp_settings", {
  id: serial("id").primaryKey(),
  host: varchar("host", { length: 255 }).notNull(),
  port: integer("port").notNull().default(587),
  secure: boolean("secure").default(false).notNull(), // true for 465, false for other ports
  username: varchar("username", { length: 255 }).notNull(),
  password: varchar("password", { length: 255 }).notNull(),
  fromEmail: varchar("from_email", { length: 255 }).notNull(),
  fromName: varchar("from_name", { length: 255 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  testStatus: varchar("test_status", { length: 20 }).default("untested"), // 'untested', 'success', 'failed'
  testMessage: text("test_message"),
  lastTestedAt: timestamp("last_tested_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Analytics Events for tracking user behavior and platform usage
export const analyticsEvents = pgTable("analytics_events", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id"), // nullable for anonymous events
  sessionId: varchar("session_id", { length: 128 }),
  eventType: varchar("event_type", { length: 50 }).notNull(), // page_view, image_generation, credit_purchase, login, etc.
  eventData: jsonb("event_data"), // additional event-specific data like model used, credits spent, etc.
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address", { length: 45 }),
  referrer: text("referrer"),
  country: varchar("country", { length: 2 }), // ISO country code
  timestamp: timestamp("timestamp").defaultNow(),
});

// Daily Analytics Summaries for performance and dashboard display
export const dailyAnalytics = pgTable("daily_analytics", {
  id: serial("id").primaryKey(),
  date: varchar("date", { length: 10 }).notNull().unique(), // YYYY-MM-DD format
  totalUsers: integer("total_users").default(0),
  newUsers: integer("new_users").default(0),
  activeUsers: integer("active_users").default(0),
  imagesGenerated: integer("images_generated").default(0),
  creditsSpent: integer("credits_spent").default(0),
  creditsPurchased: integer("credits_purchased").default(0),
  revenue: decimal("revenue", { precision: 10, scale: 2 }).default("0"),
  topModels: jsonb("top_models"), // most used AI models with usage counts
  averageSessionDuration: integer("average_session_duration"), // in minutes
  pageViews: integer("page_views").default(0),
  bounceRate: decimal("bounce_rate", { precision: 5, scale: 2 }).default("0"), // percentage
  conversionRate: decimal("conversion_rate", { precision: 5, scale: 2 }).default("0"), // percentage
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
  videos: many(videos),
  subscriptions: many(subscriptions),
  creditTransactions: many(creditTransactions),
  imageShares: many(imageShares),
  videoShares: many(videoShares),
  collections: many(collections),
  imageComments: many(imageComments),
  sentInvites: many(collaborationInvites, { relationName: "sentInvites" }),
  createdCoupons: many(coupons),
  couponRedemptions: many(couponRedemptions),
  createdCouponBatches: many(couponBatches),
  notifications: many(notifications),
  activities: many(userActivities),
  socialShares: many(socialShares),

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
  videos: many(videos),
  planAiModels: many(planAiModels),
}));

export const imagesRelations = relations(images, ({ one, many }) => ({
  user: one(users, { fields: [images.userId], references: [users.id] }),
  model: one(aiModels, { fields: [images.modelId], references: [aiModels.id] }),
  creditTransaction: one(creditTransactions, { fields: [images.id], references: [creditTransactions.imageId] }),
  shares: many(imageShares),
  comments: many(imageComments),
  collectionItems: many(collectionItems),
  socialShares: many(socialShares),
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



export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

export const userActivitiesRelations = relations(userActivities, ({ one }) => ({
  user: one(users, { fields: [userActivities.userId], references: [users.id] }),
}));



export const socialSharesRelations = relations(socialShares, ({ one }) => ({
  user: one(users, { fields: [socialShares.userId], references: [users.id] }),
  image: one(images, { fields: [socialShares.imageId], references: [images.id] }),
}));

// Video relations
export const videosRelations = relations(videos, ({ one, many }) => ({
  user: one(users, { fields: [videos.userId], references: [users.id] }),
  model: one(aiModels, { fields: [videos.modelId], references: [aiModels.id] }),
  shares: many(videoShares),
}));

export const videoSharesRelations = relations(videoShares, ({ one }) => ({
  video: one(videos, { fields: [videoShares.videoId], references: [videos.id] }),
  user: one(users, { fields: [videoShares.userId], references: [users.id] }),
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

export const insertVideoSchema = createInsertSchema(videos).omit({
  id: true,
  createdAt: true,
});

export const insertVideoShareSchema = createInsertSchema(videoShares).omit({
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



export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  read: true,
  emailSent: true,
  createdAt: true,
});

export const insertUserActivitySchema = createInsertSchema(userActivities).omit({
  id: true,
  createdAt: true,
});

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSocialShareSchema = createInsertSchema(socialShares).omit({
  id: true,
  createdAt: true,
});

export const insertSmtpSettingsSchema = createInsertSchema(smtpSettings).omit({
  id: true,
  testStatus: true,
  testMessage: true,
  lastTestedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAnalyticsEventSchema = createInsertSchema(analyticsEvents).omit({
  id: true,
  timestamp: true,
});

export const insertDailyAnalyticsSchema = createInsertSchema(dailyAnalytics).omit({
  id: true,
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
export type Video = typeof videos.$inferSelect;
export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type VideoShare = typeof videoShares.$inferSelect;
export type InsertVideoShare = z.infer<typeof insertVideoShareSchema>;
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



// Notification system types
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type UserActivity = typeof userActivities.$inferSelect;
export type InsertUserActivity = z.infer<typeof insertUserActivitySchema>;
export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;

// Social sharing types
export type SocialShare = typeof socialShares.$inferSelect;
export type InsertSocialShare = z.infer<typeof insertSocialShareSchema>;

// SMTP settings types
export type SmtpSettings = typeof smtpSettings.$inferSelect;
export type InsertSmtpSettings = z.infer<typeof insertSmtpSettingsSchema>;



// Analytics types
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type InsertAnalyticsEvent = z.infer<typeof insertAnalyticsEventSchema>;
export type DailyAnalytics = typeof dailyAnalytics.$inferSelect;
export type InsertDailyAnalytics = z.infer<typeof insertDailyAnalyticsSchema>;

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
