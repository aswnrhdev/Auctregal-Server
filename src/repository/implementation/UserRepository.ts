import bcrypt from 'bcrypt';
import mongoose, { Types } from 'mongoose';
import { IUser } from "../../entities/UsersEntity";
import UserModel from "../../models/usersModel";
import { IUserRepository } from "../interface/IUserRepository";

class UserRepository implements IUserRepository {
    async createUser(userData: Partial<IUser>): Promise<IUser> {
        try {
            const user = new UserModel(userData);
            const savedUser = await user.save();
            return savedUser;
        } catch (error: any) {
            throw new Error(`Error creating user: ${error.message}`);
        }
    }

    async verifyUser(email: string): Promise<IUser | null> {
        try {
            return await UserModel.findOne({ email }).exec();
        } catch (error) {
            console.log('Error verifying user:', error);
            return null;
        }
    }

    async verifyUserById(id: string): Promise<IUser | null> {
        try {
            return await UserModel.findById(id).exec();
        } catch (error) {
            console.log('Error verifying user by ID:', error);
            return null;
        }
    }

    async checkPassword(user: IUser, password: string): Promise<boolean> {
        try {
            return await bcrypt.compare(password, user.password);
        } catch (error: any) {
            console.log('Error checking password:', error);
            throw new Error(`Error checking password: ${error.message}`);
        }
    }

    async isAdmin(user: IUser): Promise<boolean> {
        try {
            return user.role === 'admin';
        } catch (error: any) {
            console.log('Error checking admin status:', error);
            throw new Error(`Error checking admin status: ${error.message}`);
        }
    }

    async getUsersByRole(role: string): Promise<IUser[]> {
        try {
            return await UserModel.find({ role }).exec();
        } catch (error: any) {
            throw new Error(`Error fetching users by role: ${error.message}`);
        }
    }

    async updateUserStatus(id: string, isBlocked: boolean): Promise<void> {
        try {
            await UserModel.findByIdAndUpdate(id, { isBlocked }).exec();
        } catch (error: any) {
            throw new Error(`Error updating user status: ${error.message}`);
        }
    }

    async saveRefreshToken(userId: string, refreshToken: string): Promise<void> {
        try {
            await UserModel.findByIdAndUpdate(userId, { refreshToken }).exec();
        } catch (error: any) {
            throw new Error(`Error saving refresh token: ${error.message}`);
        }
    }

    async updateUserName(id: string, name: string): Promise<IUser | null> {
        try {
            const user = await UserModel.findById(id).exec();
            if (user) {
                user.name = name;
                await user.save();
                return user;
            }
            return null;
        } catch (error: any) {
            console.log('Error updating user name:', error);
            throw new Error(`Error updating user name: ${error.message}`);
        }
    }

    async updateUserProfileImage(userId: string, imageUrl: string): Promise<IUser | null> {
        try {
            const user = await UserModel.findById(userId).exec(); 
            if (user) {
                user.image = imageUrl;
                await user.save();
                return user;
            }
            return null;
        } catch (error) {
            console.error('Error updating user profile image:', error);
            throw new Error('Database error');
        }
    }

    async updateUserAddress(id: string, addressData: { 
        street?: string; 
        city?: string; 
        state?: string; 
        zipCode?: string; 
        country?: string 
    }): Promise<IUser | null> {
        try {
            const user = await UserModel.findByIdAndUpdate(id, addressData, { new: true }).exec();
            return user;
        } catch (error: any) {
            console.log('Error updating user address:', error);
            throw new Error(`Error updating user address: ${error.message}`);
        }
    }

    async addUserAddress(id: string, addressData: { 
        street?: string; 
        city?: string; 
        state?: string; 
        zipCode?: string; 
        country?: string 
    }): Promise<IUser | null> {
        try {
            const user = await UserModel.findByIdAndUpdate(id, 
                { $set: addressData }, 
                { new: true, upsert: true }
            ).exec();
            return user;
        } catch (error: any) {
            console.log('Error adding user address:', error);
            throw new Error(`Error adding user address: ${error.message}`);
        }
    }

    async isAuctCodeUnique(auctCode: string): Promise<boolean> {
        try {
            const user = await UserModel.findOne({ auctCode }).exec();
            return !user;
        } catch (error: any) {
            throw new Error(`Error checking if auctCode is unique: ${error.message}`);
        }
    }

    async updateUserAuctCode(userId: mongoose.Types.ObjectId | string, auctCode: string): Promise<void> {
        try {
            await UserModel.findByIdAndUpdate(userId, { auctCode: auctCode }).exec();
        } catch (error: any) {
            throw new Error(`Error updating user Auct code: ${error.message}`);
        }
    }

    async getAdminUser(): Promise<IUser | null> {
        try {
            return await UserModel.findOne({ role: 'admin' }).exec();
        } catch (error: any) {
            throw new Error(`Error fetching admin user: ${error.message}`);
        }
    }

    async updateAdminWallet(adminId: mongoose.Types.ObjectId | string, amount: number): Promise<void> {
        try {
            await UserModel.findByIdAndUpdate(adminId, { $inc: { walletBalance: amount } }).exec();
        } catch (error: any) {
            throw new Error(`Error updating admin wallet: ${error.message}`);
        }
    }
}

export default UserRepository;
