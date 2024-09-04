import { IUser } from "../../entities/UsersEntity";
import { OtpUser } from "../../entities/UsersOtp";
import UserModel from "../../models/usersModel";
import OtpModel from "../../models/usersOtp";
import { IOtpUserRepository } from "../interface/IOtpRepository";

class OtpRepository implements IOtpUserRepository {
    async createOtp(otpData: OtpUser): Promise<void> {
        try {
            const { email, otp } = otpData;

            if (!email || !otp) {
                throw new Error('Email and OTP are required');
            }

            const existingOtp = await OtpModel.findOne({ email });

            if (existingOtp) {
                existingOtp.otp = otp;
                existingOtp.createdAt = new Date(); 
                await existingOtp.save();
            } else {
                const otpInstance = new OtpModel(otpData);
                await otpInstance.save();
            }
        } catch (error) {
            console.error('Error creating OTP:', error);
            throw new Error('Error creating OTP');
        }
    }

    async findOtpByEmail(email: string): Promise<OtpUser | null> {
        try {
            return await OtpModel.findOne({ email }).exec();
        } catch (error) {
            console.error('Error finding OTP by email:', error);
            throw new Error('Error finding OTP by email');
        }
    }

    async updateOtpStatus(email: string): Promise<void> {
        try {
            await OtpModel.deleteOne({ email }).exec();
        } catch (error) {
            console.error('Error updating OTP status:', error);
            throw new Error('Error updating OTP status');
        }
    }

    async findUserByEmail(email: string): Promise<IUser | null> {
        try {
            return await UserModel.findOne({ email }).exec();
        } catch (error) {
            console.error('Error finding user by email:', error);
            throw new Error('Error finding user by email');
        }
    }

    async markUserAsVerified(email: string): Promise<void> {
        try {
            await UserModel.updateOne({ email }, { $set: { verified: true } }).exec();
        } catch (error) {
            console.error('Error marking user as verified:', error);
            throw new Error('Error marking user as verified');
        }
    }
}

export default OtpRepository;
