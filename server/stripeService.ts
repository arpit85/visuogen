import Stripe from "stripe";
import { db } from "./db";
import { stripeCustomers } from "@shared/schema";
import { eq } from "drizzle-orm";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY environment variable is required");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia",
});

export class StripeService {
  async createOrGetCustomer(user: any) {
    // Check if customer already exists
    const [existingCustomer] = await db
      .select()
      .from(stripeCustomers)
      .where(eq(stripeCustomers.userId, user.id.toString()));

    if (existingCustomer) {
      return existingCustomer.stripeCustomerId;
    }

    // Create new Stripe customer
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : undefined,
      metadata: {
        userId: user.id.toString(),
      },
    });

    // Save to database
    const [newCustomerRecord] = await db
      .insert(stripeCustomers)
      .values({
        userId: user.id.toString(),
        stripeCustomerId: customer.id,
        email: user.email,
      })
      .returning();

    return customer.id;
  }

  async createPaymentIntent(amount: number, currency: string = 'usd', customerId: string, couponId?: string) {
    const params: Stripe.PaymentIntentCreateParams = {
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      customer: customerId,
      metadata: {
        created_by: 'ai_image_forge',
      },
    };

    // Note: Coupons are applied at the payment level, not PaymentIntent level
    // They should be applied when creating the invoice or subscription

    return await stripe.paymentIntents.create(params);
  }

  async validateCoupon(couponCode: string) {
    try {
      const coupon = await stripe.coupons.retrieve(couponCode);
      return {
        isValid: coupon.valid,
        coupon,
        discountAmount: coupon.percent_off || coupon.amount_off || 0,
      };
    } catch (error) {
      return {
        isValid: false,
        error: 'Invalid coupon code',
      };
    }
  }

  async retrievePaymentIntent(paymentIntentId: string) {
    return await stripe.paymentIntents.retrieve(paymentIntentId);
  }

  async constructWebhookEvent(body: Buffer, signature: string) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET environment variable is required");
    }

    return stripe.webhooks.constructEvent(body, signature, webhookSecret);
  }

  async getUserPayments(userId: string) {
    // This method would typically integrate with the database storage
    // For now, we'll delegate to the storage layer
    const { storage } = await import('./storage');
    return await storage.getUserPayments(userId);
  }

  async handleSuccessfulPayment(paymentIntent: any, credits: number) {
    // Handle successful payment by awarding credits
    const { storage } = await import('./storage');
    const userId = paymentIntent.metadata?.userId;
    
    if (userId) {
      await storage.addCredits(userId, credits, `Credit purchase via payment ${paymentIntent.id}`);
      await storage.updatePaymentStatus(paymentIntent.id, 'succeeded');
    }
  }

  async listCoupons() {
    const coupons = await stripe.coupons.list({ limit: 100 });
    return coupons.data;
  }

  async createCoupon(couponData: any) {
    return await stripe.coupons.create(couponData);
  }
}

export const stripeService = new StripeService();