import { IUser } from "../../entities/UsersEntity";
import mongoose from 'mongoose';

export interface IUserRepository {
    createUser(userData: Partial<IUser>): Promise<IUser>;
    verifyUser(email: string): Promise<IUser | null>;
    verifyUserById(id: string): Promise<IUser | null>;  
    checkPassword(user: IUser, password: string): Promise<boolean>;
    isAdmin(user: IUser): Promise<boolean>;
    getUsersByRole(role: string): Promise<IUser[]>;
    updateUserStatus(id: string, isBlocked: boolean): Promise<void>;
    saveRefreshToken(userId: string, refreshToken: string): Promise<void>;  
    updateUserName(id: string, name: string): Promise<IUser | null>
    updateUserProfileImage(userId: string, imageUrl: string): Promise<IUser | null>
    updateUserAddress(id: string, addressData: {
        street?: string;
        city?: string;
        state?: string;
        zipCode?: string;
        country?: string
    }): Promise<IUser | null>
    addUserAddress(id: string, addressData: {
        street?: string;
        city?: string;
        state?: string;
        zipCode?: string;
        country?: string
    }): Promise<IUser | null>
    isAuctCodeUnique(auctCode: string): Promise<boolean>
    updateUserAuctCode(userId: mongoose.Types.ObjectId | string, auctCode: string): Promise<void>
    getAdminUser(): Promise<IUser | null>;
    updateAdminWallet(adminId: mongoose.Types.ObjectId | string, amount: number): Promise<void>;
}
