/**
 * Email Service
 * Handles sending emails using configured email provider
 * Supports: Resend, SendGrid, AWS SES, Nodemailer
 */

// Email provider will be initialized based on environment variables
let emailClient = null;
let emailProvider = null;

/**
 * Initialize email service based on environment configuration
 */
const initializeEmailService = () => {
  // Check for Resend (Recommended)
  if (process.env.RESEND_API_KEY) {
    const { Resend } = require('resend');
    emailClient = new Resend(process.env.RESEND_API_KEY);
    emailProvider = 'resend';
    // eslint-disable-next-line no-console
    console.log('✅ Email service initialized: Resend');
    return;
  }

  // Check for SendGrid
  if (process.env.SENDGRID_API_KEY) {
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    emailClient = sgMail;
    emailProvider = 'sendgrid';
    // eslint-disable-next-line no-console
    console.log('✅ Email service initialized: SendGrid');
    return;
  }

  // Check for AWS SES
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    const { SESClient } = require('@aws-sdk/client-ses');
    emailClient = new SESClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
    emailProvider = 'aws-ses';
    // eslint-disable-next-line no-console
    console.log('✅ Email service initialized: AWS SES');
    return;
  }

  // Fallback to Nodemailer (for development)
  if (process.env.SMTP_HOST || process.env.GMAIL_USER) {
    const nodemailer = require('nodemailer');

    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      emailClient = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });
      emailProvider = 'gmail';
      // eslint-disable-next-line no-console
      console.log('✅ Email service initialized: Gmail (Nodemailer)');
    } else if (process.env.SMTP_HOST) {
      emailClient = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });
      emailProvider = 'smtp';
      // eslint-disable-next-line no-console
      console.log('✅ Email service initialized: SMTP (Nodemailer)');
    }
    return;
  }

  /* eslint-disable no-console */
  console.warn('⚠️  No email service configured. Email features will be disabled.');
  console.warn('   Set RESEND_API_KEY, SENDGRID_API_KEY, AWS credentials, or SMTP settings');
  /* eslint-enable no-console */
};

/**
 * Send an email using the configured provider
 * @param {Object} emailData - Email data
 * @param {string} emailData.to - Recipient email address
 * @param {string} emailData.subject - Email subject
 * @param {string} emailData.html - HTML content
 * @param {string} emailData.text - Plain text content (optional)
 * @returns {Promise<Object>} Result from email provider
 */
const sendEmail = async ({ to, subject, html, text }) => {
  if (!emailClient) {
    throw new Error('Email service not configured');
  }

  const from = process.env.FROM_EMAIL || 'noreply@example.com';

  try {
    let result;

    switch (emailProvider) {
      case 'resend':
        result = await emailClient.emails.send({
          from,
          to,
          subject,
          html,
          text: text || undefined,
        });
        break;

      case 'sendgrid':
        result = await emailClient.send({
          from,
          to,
          subject,
          html,
          text: text || undefined,
        });
        break;

      case 'aws-ses': {
        const { SendEmailCommand } = require('@aws-sdk/client-ses');
        const command = new SendEmailCommand({
          Source: from,
          Destination: { ToAddresses: [to] },
          Message: {
            Subject: { Data: subject },
            Body: {
              Html: { Data: html },
              Text: text ? { Data: text } : undefined,
            },
          },
        });
        result = await emailClient.send(command);
        break;
      }

      case 'gmail':
      case 'smtp':
        result = await emailClient.sendMail({
          from,
          to,
          subject,
          html,
          text: text || undefined,
        });
        break;

      default:
        throw new Error(`Unsupported email provider: ${emailProvider}`);
    }

    // eslint-disable-next-line no-console
    console.log(`✅ Email sent to ${to}: ${subject}`);
    return result;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('❌ Email send failed:', error);
    throw error;
  }
};

/**
 * Send waitlist approval notification
 */
const sendWaitlistApprovalEmail = async (email, username) => {
  const subject = '🎉 Welcome! Your Account is Now Active';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 You're In!</h1>
          </div>
          <div class="content">
            <p>Hi ${username || 'there'},</p>
            <p>Great news! Your account has been approved and is now active.</p>
            <p>You can now:</p>
            <ul>
              <li>Browse and listen to tracks</li>
              <li>Watch reels</li>
              <li>Follow your favorite creators</li>
              <li>Like and engage with content</li>
            </ul>
            <p>Want to become a content creator? You can apply for creator status from your profile!</p>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" class="button">Start Exploring</a>
            <p>If you have any questions, feel free to reach out to us at ${process.env.SUPPORT_EMAIL || 'support@example.com'}</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Music Combinators. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Hi ${username || 'there'},

Great news! Your account has been approved and is now active.

You can now:
- Browse and listen to tracks
- Watch reels
- Follow your favorite creators
- Like and engage with content

Want to become a content creator? You can apply for creator status from your profile!

Start exploring: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/login

If you have any questions, reach out at ${process.env.SUPPORT_EMAIL || 'support@example.com'}
  `;

  return sendEmail({ to: email, subject, html, text });
};

/**
 * Send creator application approval notification
 */
const sendCreatorApprovalEmail = async (email, username) => {
  const subject = '🎊 Creator Application Approved!';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #f5576c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎊 You're Now a Creator!</h1>
          </div>
          <div class="content">
            <p>Hi ${username || 'there'},</p>
            <p>Congratulations! Your creator application has been approved.</p>
            <p>You now have access to:</p>
            <ul>
              <li>Upload and share your music tracks</li>
              <li>Create and post reels</li>
              <li>Build your audience</li>
              <li>Track your content performance</li>
            </ul>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/creator/upload" class="button">Start Creating</a>
            <p>We're excited to see what you create! If you need any help getting started, check out our creator guidelines or contact support.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Music Combinators. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Hi ${username || 'there'},

Congratulations! Your creator application has been approved.

You now have access to:
- Upload and share your music tracks
- Create and post reels
- Build your audience
- Track your content performance

Start creating: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/creator/upload

We're excited to see what you create!
  `;

  return sendEmail({ to: email, subject, html, text });
};

/**
 * Send creator application rejection notification
 */
const sendCreatorRejectionEmail = async (email, username, reason) => {
  const subject = 'Creator Application Update';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #6c757d; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .reason { background: #fff; padding: 15px; border-left: 4px solid #f5576c; margin: 20px 0; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Creator Application Update</h1>
          </div>
          <div class="content">
            <p>Hi ${username || 'there'},</p>
            <p>Thank you for applying to become a creator on our platform. After careful review, we're unable to approve your application at this time.</p>
            ${reason ? `<div class="reason"><strong>Reason:</strong> ${reason}</div>` : ''}
            <p>Don't worry! You can:</p>
            <ul>
              <li>Continue enjoying content as a listener</li>
              <li>Reapply after addressing the feedback</li>
              <li>Contact support if you have questions</li>
            </ul>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/support" class="button">Contact Support</a>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Music Combinators. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Hi ${username || 'there'},

Thank you for applying to become a creator on our platform. After careful review, we're unable to approve your application at this time.

${reason ? `Reason: ${reason}` : ''}

Don't worry! You can:
- Continue enjoying content as a listener
- Reapply after addressing the feedback
- Contact support if you have questions

Contact support: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/support
  `;

  return sendEmail({ to: email, subject, html, text });
};

/**
 * Send password reset email
 */
const sendPasswordResetEmail = async (email, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
  const subject = 'Password Reset Request';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #667eea; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .warning { background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔒 Password Reset</h1>
          </div>
          <div class="content">
            <p>You recently requested to reset your password. Click the button below to proceed:</p>
            <a href="${resetUrl}" class="button">Reset Password</a>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>
            <div class="warning">
              <strong>⚠️ Security Notice:</strong>
              <ul>
                <li>This link expires in 1 hour</li>
                <li>If you didn't request this, ignore this email</li>
                <li>Never share this link with anyone</li>
              </ul>
            </div>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Music Combinators. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Password Reset Request

You recently requested to reset your password. Click the link below to proceed:

${resetUrl}

⚠️ Security Notice:
- This link expires in 1 hour
- If you didn't request this, ignore this email
- Never share this link with anyone
  `;

  return sendEmail({ to: email, subject, html, text });
};

// Initialize email service on module load
initializeEmailService();

module.exports = {
  sendEmail,
  sendWaitlistApprovalEmail,
  sendCreatorApprovalEmail,
  sendCreatorRejectionEmail,
  sendPasswordResetEmail,
  isConfigured: () => emailClient !== null,
  getProvider: () => emailProvider,
};
