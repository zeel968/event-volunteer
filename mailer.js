import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

/**
 * Sends a 6-digit OTP to the specified email address.
 * @param {string} email - Recipient email.
 * @param {string} otp - 6-digit OTP code.
 */
export const sendOTP = async (email, otp) => {
  const mailOptions = {
    from: `"Event Volunteer App" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: 'Your Verification Code',
    text: `Your 6-digit verification code is: ${otp}. It will expire in 5 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #4F46E5; text-align: center;">Verification Code</h2>
        <p style="font-size: 16px; color: #555;">Hello,</p>
        <p style="font-size: 16px; color: #555;">Your one-time password (OTP) for the <b>Event Volunteer App</b> is:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 32px; font-weight: bold; color: #4F46E5; letter-spacing: 5px; background: #f3f4f6; padding: 10px 20px; border-radius: 5px;">${otp}</span>
        </div>
        <p style="font-size: 14px; color: #777;">This code is valid for <b>5 minutes</b>. Do not share this code with anyone.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #aaa; text-align: center;">If you did not request this code, please ignore this email.</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};
