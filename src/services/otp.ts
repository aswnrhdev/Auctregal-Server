import OtpRepository from '../repository/implementation/OtpRepository';
import { sendOtpEmail } from './emailService';

const otpRepository = new OtpRepository();

export const requestOtp = async (email: string) => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    try {
        await otpRepository.createOtp({
            email,
            otp,
        });
        await sendOtpEmail(email, otp);
        console.log(`OTP ${otp} for ${email} saved in the database`);
    } catch (error) {
        console.error('Error requesting OTP:', error);
        throw new Error('Unable to request OTP');
    }
};
