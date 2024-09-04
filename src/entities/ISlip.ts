import { Document, Types } from 'mongoose';

export interface ISlip extends Document {
    userId: Types.ObjectId;
    itemId: Types.ObjectId;
    slipCode: string;
    qrCode: string;
    createdAt: Date;
}