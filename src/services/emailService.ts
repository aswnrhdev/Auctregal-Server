import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

export const sendOtpEmail = async (recipientEmail: string, otp: string) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: recipientEmail,
        subject: 'Your OTP Code',
        html: `
            <p>Hi there,</p>
            <p>Your OTP code is <strong>${otp}</strong>.</p>
            <p>Please use this code to complete your registration process.</p>
            <p>Thank you!</p>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`OTP sent to ${recipientEmail}`);
    } catch (error) {
        console.error(`Failed to send OTP to ${recipientEmail}:`, error);
        throw new Error('Failed to send OTP');
    }
};

export const sendPaymentConfirmationEmail = async (recipientEmail: string, auctCode: string) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: recipientEmail,
        subject: 'Payment Successful - Your Auct Code',
        html: `
            <p>Dear User,</p>
            <p>Your payment has been successfully processed. Thank you for your registration.</p>
            <p>Your Auct Code is: <strong>${auctCode}</strong></p>
            <p>Please save this code for further procedures. You will need it for upcoming steps in the auction process.</p>
            <p>If you have any questions, please don't hesitate to contact us.</p>
            <p>Best regards,<br>The Auctregal Team</p>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Payment confirmation email sent to ${recipientEmail}`);
    } catch (error) {
        console.error(`Failed to send payment confirmation email to ${recipientEmail}:`, error);
        throw new Error('Failed to send payment confirmation email');
    }
};


export const sendSlipEmail = async (recipientEmail: string, qrCodeData: string, slipData: any) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: recipientEmail,
        subject: 'Your Auction Slip',
        html: `
        <h1>Your Auction Slip</h1>
        <p>Dear ${slipData.userName},</p>
        <p>Here's your auction slip for the item "${slipData.itemTitle}".</p>
        <p>Slip Code: <strong>${slipData.slipCode}</strong></p>
        <img src="${qrCodeData}" alt="QR Code" />
        <p>Please present this QR code when collecting your item.</p>
        <p>Thank you for using our service!</p>
      `,
        attachments: [{
            filename: 'qr-code.png',
            content: qrCodeData.split('base64,')[1],
            encoding: 'base64'
        }]
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Slip email sent to ${recipientEmail}`);
    } catch (error) {
        console.error(`Failed to send slip email to ${recipientEmail}:`, error);
        throw new Error('Failed to send slip email');
    }
};