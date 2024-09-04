import mongoose, { Document, Schema } from "mongoose";
import { IUser } from "../entities/UsersEntity";

const userSchema: Schema = new Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: false
    },
    street: {
        type: String,
        required: false
    },
    image: {
        type: String,
        required: false
    },
    isBlocked: {
        type:Boolean,
        default:false
    },
    city: {
        type: String,
        required: false
    },
    state: {
        type: String,
        required: false
    },
    wallet: { type: Number, default: 0 },
    zipCode: {
        type: String,
        required: false
    },
    refreshToken: {
        type: String,
        required: false,
    },
    country: {
        type: String,
        required: false
    },
    role: {
        type: String,
        required: false
    },
    bidderScore: {
        type: Number,
        default: 0
    },
    sellerScore: {
        type: Number,
        default: 0
    },
    walletBalance: {
        type: Number,
        default: 0.0
    },
    verified: {
        type: Boolean,
        default: false
    },
    auctCode: {
        type: String,
        required: false,
        unique: true
    },
    sellerAuctCode: {
        type: String,
        required: false,
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

const UserModel = mongoose.model<IUser>('User', userSchema);

export default UserModel;
