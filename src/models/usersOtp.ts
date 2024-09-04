import mongoose, { Document, Schema } from "mongoose";
import { OtpUser } from "../entities/UsersOtp";

const otpSchema: Schema<OtpUser & Document> = new Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    otp: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: '1m',
        required: true
    }
});

const OtpModel = mongoose.model<OtpUser & Document>('Otp', otpSchema);

export default OtpModel;
