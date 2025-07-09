import { db } from "./db";
import { analyticsEvents, dailyAnalytics, users, images, creditTransactions } from "@shared/schema";
import { sql, eq, desc, and, gte, lte, count } from "drizzle-orm";
import type { InsertAnalyticsEvent, InsertDailyAnalytics } from "@shared/schema";

export class AnalyticsService {
  // Track user events
  async trackEvent(eventData: InsertAnalyticsEvent): Promise<void> {
    try {
      await db.insert(analyticsEvents).values(eventData);
    } catch (error) {
      console.error("Failed to track analytics event:", error);
    }
  }

  // Get analytics dashboard data
  async getDashboardStats(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const endDate = new Date();

    // Get daily analytics for the period
    const dailyStats = await db
      .select()
      .from(dailyAnalytics)
      .where(
        and(
          gte(dailyAnalytics.date, startDate.toISOString().split('T')[0]),
          lte(dailyAnalytics.date, endDate.toISOString().split('T')[0])
        )
      )
      .orderBy(desc(dailyAnalytics.date));

    // Get overall totals
    const totalUsers = await db.select({ count: count() }).from(users);
    const totalImages = await db.select({ count: count() }).from(images);
    const totalRevenue = await db
      .select({ 
        total: sql<number>`COALESCE(SUM(${creditTransactions.amount}), 0)` 
      })
      .from(creditTransactions)
      .where(eq(creditTransactions.type, 'purchase'));

    // Calculate growth rates
    const previousPeriodStart = new Date(startDate);
    previousPeriodStart.setDate(previousPeriodStart.getDate() - days);
    
    const previousStats = await db
      .select()
      .from(dailyAnalytics)
      .where(
        and(
          gte(dailyAnalytics.date, previousPeriodStart.toISOString().split('T')[0]),
          lte(dailyAnalytics.date, startDate.toISOString().split('T')[0])
        )
      );

    const currentPeriodUsers = dailyStats.reduce((sum, day) => sum + (day.newUsers || 0), 0);
    const previousPeriodUsers = previousStats.reduce((sum, day) => sum + (day.newUsers || 0), 0);
    const userGrowth = previousPeriodUsers > 0 ? 
      ((currentPeriodUsers - previousPeriodUsers) / previousPeriodUsers) * 100 : 0;

    const currentPeriodImages = dailyStats.reduce((sum, day) => sum + (day.imagesGenerated || 0), 0);
    const previousPeriodImages = previousStats.reduce((sum, day) => sum + (day.imagesGenerated || 0), 0);
    const imageGrowth = previousPeriodImages > 0 ? 
      ((currentPeriodImages - previousPeriodImages) / previousPeriodImages) * 100 : 0;

    const currentPeriodRevenue = dailyStats.reduce((sum, day) => sum + parseFloat(day.revenue || "0"), 0);
    const previousPeriodRevenue = previousStats.reduce((sum, day) => sum + parseFloat(day.revenue || "0"), 0);
    const revenueGrowth = previousPeriodRevenue > 0 ? 
      ((currentPeriodRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100 : 0;

    return {
      overview: {
        totalUsers: totalUsers[0]?.count || 0,
        totalImages: totalImages[0]?.count || 0,
        totalRevenue: totalRevenue[0]?.total || 0,
        userGrowth: Math.round(userGrowth * 100) / 100,
        imageGrowth: Math.round(imageGrowth * 100) / 100,
        revenueGrowth: Math.round(revenueGrowth * 100) / 100,
      },
      dailyStats,
      chartData: dailyStats.reverse().map(day => ({
        date: day.date,
        users: day.newUsers || 0,
        images: day.imagesGenerated || 0,
        revenue: parseFloat(day.revenue || "0"),
        activeUsers: day.activeUsers || 0,
      })),
    };
  }

  // Get real-time analytics
  async getRealTimeStats() {
    const today = new Date().toISOString().split('T')[0];
    const lastHour = new Date(Date.now() - 60 * 60 * 1000);

    // Today's stats
    const todayStats = await db
      .select()
      .from(dailyAnalytics)
      .where(eq(dailyAnalytics.date, today))
      .limit(1);

    // Last hour activity
    const recentEvents = await db
      .select()
      .from(analyticsEvents)
      .where(gte(analyticsEvents.timestamp, lastHour))
      .orderBy(desc(analyticsEvents.timestamp))
      .limit(100);

    // Active users in last hour
    const activeUsers = await db
      .select({ 
        count: sql<number>`COUNT(DISTINCT ${analyticsEvents.userId})` 
      })
      .from(analyticsEvents)
      .where(
        and(
          gte(analyticsEvents.timestamp, lastHour),
          sql`${analyticsEvents.userId} IS NOT NULL`
        )
      );

    return {
      today: todayStats[0] || {
        date: today,
        newUsers: 0,
        imagesGenerated: 0,
        revenue: "0",
        activeUsers: 0,
      },
      recentActivity: recentEvents,
      activeUsersLastHour: activeUsers[0]?.count || 0,
    };
  }

  // Get top performing models
  async getTopModels(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const modelStats = await db
      .select({
        modelId: images.modelId,
        count: count(),
        model: sql<any>`json_build_object('id', ai_models.id, 'name', ai_models.name, 'provider', ai_models.provider, 'credit_cost', ai_models.credit_cost)`
      })
      .from(images)
      .leftJoin(sql`ai_models`, sql`ai_models.id = ${images.modelId}`)
      .where(gte(images.createdAt, startDate))
      .groupBy(images.modelId)
      .orderBy(desc(count()))
      .limit(10);

    return modelStats;
  }

  // Get user behavior analytics
  async getUserBehavior(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Most active users
    const activeUsers = await db
      .select({
        userId: analyticsEvents.userId,
        eventCount: count(),
        user: sql<any>`json_build_object('id', users.id, 'email', users.email, 'first_name', users.first_name, 'last_name', users.last_name)`
      })
      .from(analyticsEvents)
      .leftJoin(users, eq(analyticsEvents.userId, users.id))
      .where(
        and(
          gte(analyticsEvents.timestamp, startDate),
          sql`${analyticsEvents.userId} IS NOT NULL`
        )
      )
      .groupBy(analyticsEvents.userId, users.id)
      .orderBy(desc(count()))
      .limit(10);

    // Event distribution
    const eventDistribution = await db
      .select({
        eventType: analyticsEvents.eventType,
        count: count(),
      })
      .from(analyticsEvents)
      .where(gte(analyticsEvents.timestamp, startDate))
      .groupBy(analyticsEvents.eventType)
      .orderBy(desc(count()));

    return {
      activeUsers,
      eventDistribution,
    };
  }

  // Generate daily analytics summary (to be run daily via cron)
  async generateDailyAnalytics(date?: string) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const startOfDay = new Date(`${targetDate}T00:00:00Z`);
    const endOfDay = new Date(`${targetDate}T23:59:59Z`);

    // Count new users for the day
    const newUsersCount = await db
      .select({ count: count() })
      .from(users)
      .where(
        and(
          gte(users.createdAt, startOfDay),
          lte(users.createdAt, endOfDay)
        )
      );

    // Count active users (users who performed any action)
    const activeUsersCount = await db
      .select({ 
        count: sql<number>`COUNT(DISTINCT ${analyticsEvents.userId})` 
      })
      .from(analyticsEvents)
      .where(
        and(
          gte(analyticsEvents.timestamp, startOfDay),
          lte(analyticsEvents.timestamp, endOfDay),
          sql`${analyticsEvents.userId} IS NOT NULL`
        )
      );

    // Count images generated
    const imagesGeneratedCount = await db
      .select({ count: count() })
      .from(images)
      .where(
        and(
          gte(images.createdAt, startOfDay),
          lte(images.createdAt, endOfDay)
        )
      );

    // Calculate revenue and credits
    const creditStats = await db
      .select({
        purchased: sql<number>`COALESCE(SUM(CASE WHEN type = 'purchase' THEN amount ELSE 0 END), 0)`,
        spent: sql<number>`COALESCE(SUM(CASE WHEN type = 'deduction' THEN ABS(amount) ELSE 0 END), 0)`,
        revenue: sql<number>`COALESCE(SUM(CASE WHEN type = 'purchase' THEN amount * 0.10 ELSE 0 END), 0)`, // assuming $0.10 per credit
      })
      .from(creditTransactions)
      .where(
        and(
          gte(creditTransactions.createdAt, startOfDay),
          lte(creditTransactions.createdAt, endOfDay)
        )
      );

    // Get top models for the day
    const topModels = await db
      .select({
        modelId: images.modelId,
        count: count(),
      })
      .from(images)
      .where(
        and(
          gte(images.createdAt, startOfDay),
          lte(images.createdAt, endOfDay)
        )
      )
      .groupBy(images.modelId)
      .orderBy(desc(count()))
      .limit(5);

    // Calculate session duration (approximate based on event timestamps)
    const sessionDuration = await db
      .select({
        avgDuration: sql<number>`COALESCE(AVG(duration), 0)`
      })
      .from(
        sql`(
          SELECT 
            user_id,
            EXTRACT(EPOCH FROM (MAX(timestamp) - MIN(timestamp))) / 60 as duration
          FROM analytics_events 
          WHERE timestamp >= ${startOfDay} 
            AND timestamp <= ${endOfDay}
            AND user_id IS NOT NULL
          GROUP BY user_id, session_id
          HAVING COUNT(*) > 1
        ) as sessions`
      );

    const analyticsData: InsertDailyAnalytics = {
      date: targetDate,
      totalUsers: 0, // Will be calculated separately
      newUsers: newUsersCount[0]?.count || 0,
      activeUsers: activeUsersCount[0]?.count || 0,
      imagesGenerated: imagesGeneratedCount[0]?.count || 0,
      creditsSpent: creditStats[0]?.spent || 0,
      creditsPurchased: creditStats[0]?.purchased || 0,
      revenue: creditStats[0]?.revenue?.toString() || "0",
      topModels: topModels,
      averageSessionDuration: Math.round(sessionDuration[0]?.avgDuration || 0),
      pageViews: 0, // Will be calculated from page_view events
      bounceRate: 0, // Will be calculated based on single-page sessions
      conversionRate: 0, // Will be calculated based on purchase events
    };

    // Upsert the daily analytics
    await db
      .insert(dailyAnalytics)
      .values(analyticsData)
      .onConflictDoUpdate({
        target: dailyAnalytics.date,
        set: {
          ...analyticsData,
          updatedAt: new Date(),
        },
      });

    return analyticsData;
  }
}

export const analyticsService = new AnalyticsService();