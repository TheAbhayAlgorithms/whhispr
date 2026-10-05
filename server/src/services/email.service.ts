import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export class EmailService {
  private static transporter: nodemailer.Transporter | null = null;

  private static getTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      if (env.SMTP_HOST && env.SMTP_USER) {
        this.transporter = nodemailer.createTransport({
          host: env.SMTP_HOST,
          port: env.SMTP_PORT,
          secure: env.SMTP_PORT === 465,
          auth: {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS,
          },
        });
      } else {
        // Fallback json transport for development/testing
        this.transporter = nodemailer.createTransport({
          jsonTransport: true,
        });
      }
    }
    return this.transporter;
  }

  static async sendVerificationEmail(to: string, token: string): Promise<void> {
    const verifyUrl = `${env.CLIENT_URL}/verify-email?token=${token}`;
    logger.info(`[EmailService] Verification link generated for ${to}: ${verifyUrl}`);

    if (env.isTest) return;

    try {
      await this.getTransporter().sendMail({
        from: env.EMAIL_FROM,
        to,
        subject: 'Verify your Whhispr account',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>Welcome to Whhispr!</h2>
            <p>Please click the button below to verify your email address:</p>
            <p><a href="${verifyUrl}" style="background-color: #6366f1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">Verify Email</a></p>
            <p style="color: #6b7280; font-size: 12px;">If you did not create this account, you can safely ignore this email.</p>
          </div>
        `,
      });
    } catch (err: unknown) {
      logger.error('[EmailService] Failed to send verification email', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  static async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const resetUrl = `${env.CLIENT_URL}/reset-password?token=${token}`;
    logger.info(`[EmailService] Password reset link generated for ${to}: ${resetUrl}`);

    if (env.isTest) return;

    try {
      await this.getTransporter().sendMail({
        from: env.EMAIL_FROM,
        to,
        subject: 'Reset your Whhispr password',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>Password Reset Request</h2>
            <p>You requested a password reset for your Whhispr account. Click below to choose a new password:</p>
            <p><a href="${resetUrl}" style="background-color: #6366f1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a></p>
            <p style="color: #6b7280; font-size: 12px;">This link will expire in 1 hour. If you didn't request this, ignore this email.</p>
          </div>
        `,
      });
    } catch (err: unknown) {
      logger.error('[EmailService] Failed to send password reset email', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
