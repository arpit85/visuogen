import { createTransporter } from './emailConfig';

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export class EmailService {
  private transporter: any;

  constructor() {
    this.transporter = createTransporter();
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.transporter) {
      console.log('Email not configured, would send:', options);
      return true; // Return true in development when email is not configured
    }

    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || 'noreply@imagiify.com',
        ...options,
      });
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
    const resetUrl = `${process.env.APP_URL || 'http://localhost:5000'}/reset-password?token=${resetToken}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password - VisuoGen</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #6366f1; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; background: #f9fafb; }
          .button { display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
          .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Reset Your Password</h1>
          </div>
          <div class="content">
            <h2>Hello!</h2>
            <p>We received a request to reset your password for your Imagiify account. If you didn't make this request, you can safely ignore this email.</p>
            
            <p>To reset your password, click the button below:</p>
            
            <a href="${resetUrl}" class="button">Reset Password</a>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #6366f1;">${resetUrl}</p>
            
            <div class="warning">
              <strong>Important:</strong> This link will expire in 1 hour for security reasons.
            </div>
            
            <p>If you're having trouble with the button above, copy and paste the URL into your web browser.</p>
          </div>
          <div class="footer">
            <p>This email was sent by VisuoGen - AI Visual Content Generator</p>
            <p>If you didn't request this password reset, please ignore this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Reset Your Password - Imagiify
      
      Hello!
      
      We received a request to reset your password for your Imagiify account. If you didn't make this request, you can safely ignore this email.
      
      To reset your password, visit this link: ${resetUrl}
      
      Important: This link will expire in 1 hour for security reasons.
      
      If you didn't request this password reset, please ignore this email.
      
      ---
      Imagiify - AI Image Generation Platform
    `;

    return await this.sendEmail({
      to: email,
      subject: 'Reset Your Password - Imagiify',
      text,
      html,
    });
  }
}

export const emailService = new EmailService();