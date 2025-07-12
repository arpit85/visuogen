// Email configuration - dynamically configured based on database SMTP settings
import { db } from './db';
import { smtpSettings } from '@shared/schema';
import { eq } from 'drizzle-orm';

export async function createTransporter() {
  // Try to import nodemailer, fall back to null if not available
  try {
    const nodemailer = await import('nodemailer');
    console.log('Nodemailer imported successfully');
    
    // Get SMTP settings from database (from smtpSettings table)
    const smtpConfig = await db
      .select()
      .from(smtpSettings)
      .where(eq(smtpSettings.isActive, true))
      .limit(1);
    
    console.log('SMTP config from database:', smtpConfig.length > 0 ? 'Found' : 'Not found');
    
    if (smtpConfig.length > 0) {
      const config = smtpConfig[0];
      console.log('SMTP config details:', {
        host: config.host,
        port: config.port,
        secure: config.secure,
        username: config.username ? 'SET' : 'NOT SET',
        password: config.password ? 'SET' : 'NOT SET'
      });
      
      if (config.host && config.username && config.password) {
        console.log('Creating SMTP transporter with database config:', config.host);
        const transporter = nodemailer.default.createTransport({
          host: config.host,
          port: config.port,
          secure: config.port === 465, // Only use SSL for port 465
          requireTLS: config.port === 587, // Use STARTTLS for port 587
          auth: {
            user: config.username,
            pass: config.password,
          },
        });
        console.log('Transporter created successfully');
        return transporter;
      } else {
        console.log('SMTP config incomplete - missing required fields');
      }
    } else {
      console.log('No active SMTP settings found in database');
    }
    
    // Fallback to environment variables if database config not found
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
      console.log('Using environment variable SMTP config');
      return nodemailer.default.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });
    }
  } catch (error) {
    console.log('Error in createTransporter:', error);
    console.log('Nodemailer not available or SMTP settings not configured');
  }

  return null;
}