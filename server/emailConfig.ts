// Email configuration - dynamically configured based on SMTP settings

export async function createTransporter() {
  // Try to import nodemailer, fall back to null if not available
  try {
    const nodemailer = await import('nodemailer');
    
    // Check if we have SMTP settings in environment variables
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
      return nodemailer.default.createTransporter({
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
    console.log('Nodemailer not available or environment variables not set');
  }

  return null;
}