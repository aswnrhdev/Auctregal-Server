import mongoose from "mongoose";

export interface IUser {
    _id: mongoose.Types.ObjectId;
    userId: string; 
    name: string;
    email: string;
    password: string;
    phone: string;
    street: string;
    verified: boolean;
    isAdmin: boolean;
    image: string;
    city: string;
    state: string;
    wallet: number;
    zipCode: string;
    auctCode: string;
    country: string;
    refreshToken: string;
    role: string;
    sellerAuctCode: string;
    isBlocked: boolean;
    bidderScore?: number;
    sellerScore?: number;
    walletBalance: number;
    createdAt: Date;
    updatedAt: Date;
}
