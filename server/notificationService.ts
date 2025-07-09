import { db } from "./db";
import { users, notifications, userActivities, emailTemplates } from "@shared/schema";
import { eq, and, desc, count } from "drizzle-orm";
import { emailService } from "./emailService";
import type { InsertNotification, InsertUserActivity, Notification, User } from "@shared/schema";

export interface NotificationData {
  userId: number;
  type: string;
  title: string;
  message: string;
  data?: any;
  sendEmail?: boolean;
}

export interface ActivityData {
  userId: number;
  action: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}

export class NotificationService {
  // Create a new notification
  async createNotification(data: NotificationData): Promise<Notification> {
    const notification = await db
      .insert(notifications)
      .values({
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        data: data.data,
      })
      .returning()
      .then(rows => rows[0]);

    // Send email notification if requested
    if (data.sendEmail) {
      await this.sendEmailNotification(notification);
    }

    return notification;
  }

  // Get user notifications with pagination
  async getUserNotifications(userId: number, page: number = 1, limit: number = 20): Promise<{
    notifications: Notification[];
    total: number;
    unreadCount: number;
  }> {
    const offset = (page - 1) * limit;

    const [notificationsList, totalCount, unreadCount] = await Promise.all([
      db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset),
      
      db
        .select({ count: count() })
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .then(rows => rows[0]?.count || 0),
      
      db
        .select({ count: count() })
        .from(notifications)
        .where(and(eq(notifications.userId, userId), eq(notifications.read, false)))
        .then(rows => rows[0]?.count || 0)
    ]);

    return {
      notifications: notificationsList,
      total: totalCount,
      unreadCount
    };
  }

  // Mark notification as read
  async markAsRead(notificationId: number, userId: number): Promise<void> {
    await db
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
  }

  // Mark all notifications as read
  async markAllAsRead(userId: number): Promise<void> {
    await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.userId, userId));
  }

  // Delete notification
  async deleteNotification(notificationId: number, userId: number): Promise<void> {
    await db
      .delete(notifications)
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
  }

  // Send email notification
  private async sendEmailNotification(notification: Notification): Promise<void> {
    try {
      // Get user info
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, notification.userId));

      if (!user || !user.email || !user.emailNotifications) {
        return;
      }

      // Send email
      const success = await emailService.sendEmail({
        to: user.email,
        subject: notification.title,
        html: this.generateEmailHTML(notification, user),
        text: this.generateEmailText(notification, user)
      });

      // Mark as email sent
      if (success) {
        await db
          .update(notifications)
          .set({ emailSent: true })
          .where(eq(notifications.id, notification.id));
      }
    } catch (error) {
      console.error('Failed to send email notification:', error);
    }
  }

  // Generate email HTML content
  private generateEmailHTML(notification: Notification, user: User): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${notification.title} - Imagiify</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #6366f1; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; background: #f9fafb; }
          .button { display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Imagiify</h1>
          </div>
          <div class="content">
            <h2>${notification.title}</h2>
            <p>Hello ${user.firstName || 'there'}!</p>
            <p>${notification.message}</p>
            <a href="${process.env.APP_URL || 'http://localhost:5000'}/dashboard" class="button">View Dashboard</a>
          </div>
          <div class="footer">
            <p>This email was sent by Imagiify - AI Image Generation Platform</p>
            <p>You can adjust your notification preferences in your account settings.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Generate email text content
  private generateEmailText(notification: Notification, user: User): string {
    return `
      ${notification.title} - Imagiify
      
      Hello ${user.firstName || 'there'}!
      
      ${notification.message}
      
      Visit your dashboard: ${process.env.APP_URL || 'http://localhost:5000'}/dashboard
      
      ---
      Imagiify - AI Image Generation Platform
      You can adjust your notification preferences in your account settings.
    `;
  }

  // Log user activity
  async logActivity(data: ActivityData): Promise<void> {
    try {
      await db
        .insert(userActivities)
        .values({
          userId: data.userId,
          action: data.action,
          details: data.details,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        });
    } catch (error) {
      console.error('Failed to log user activity:', error);
    }
  }

  // Get user activity history
  async getUserActivity(userId: number, page: number = 1, limit: number = 20): Promise<{
    activities: any[];
    total: number;
  }> {
    const offset = (page - 1) * limit;

    const [activities, totalCount] = await Promise.all([
      db
        .select()
        .from(userActivities)
        .where(eq(userActivities.userId, userId))
        .orderBy(desc(userActivities.createdAt))
        .limit(limit)
        .offset(offset),
      
      db
        .select({ count: count() })
        .from(userActivities)
        .where(eq(userActivities.userId, userId))
        .then(rows => rows[0]?.count || 0)
    ]);

    return {
      activities,
      total: totalCount
    };
  }

  // Predefined notification types
  async sendWelcomeNotification(userId: number): Promise<void> {
    await this.createNotification({
      userId,
      type: 'welcome',
      title: 'Welcome to Imagiify!',
      message: 'Thank you for joining Imagiify! You\'ve been given 10 free credits to start creating amazing AI images. Explore our 14 AI models and start generating!',
      sendEmail: true
    });
  }

  async sendLowCreditsNotification(userId: number, credits: number): Promise<void> {
    await this.createNotification({
      userId,
      type: 'credit_low',
      title: 'Low Credits Warning',
      message: `You have ${credits} credits remaining. Consider purchasing more credits to continue generating images.`,
      data: { credits },
      sendEmail: true
    });
  }

  async sendImageGeneratedNotification(userId: number, imageId: number, modelName: string): Promise<void> {
    await this.createNotification({
      userId,
      type: 'image_generated',
      title: 'Image Generated Successfully',
      message: `Your image has been generated using ${modelName}. Check it out in your gallery!`,
      data: { imageId, modelName },
      sendEmail: false
    });
  }

  async sendCreditsPurchasedNotification(userId: number, credits: number, amount: number): Promise<void> {
    await this.createNotification({
      userId,
      type: 'credits_purchased',
      title: 'Credits Purchased',
      message: `You've successfully purchased ${credits} credits for $${amount}. Happy creating!`,
      data: { credits, amount },
      sendEmail: true
    });
  }

  async sendWeeklySummary(userId: number, imagesGenerated: number, creditsUsed: number): Promise<void> {
    await this.createNotification({
      userId,
      type: 'weekly_summary',
      title: 'Weekly Summary',
      message: `This week you generated ${imagesGenerated} images and used ${creditsUsed} credits. Keep up the creativity!`,
      data: { imagesGenerated, creditsUsed },
      sendEmail: true
    });
  }

  // Update user's last login
  async updateLastLogin(userId: number): Promise<void> {
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, userId));
  }

  // Toggle email notifications
  async toggleEmailNotifications(userId: number, enabled: boolean): Promise<void> {
    await db
      .update(users)
      .set({ emailNotifications: enabled })
      .where(eq(users.id, userId));
  }
}

export const notificationService = new NotificationService();