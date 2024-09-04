import mongoose, { Schema, Document } from 'mongoose';

export interface ISlip extends Document {
  userId: mongoose.Types.ObjectId;
  itemId: mongoose.Types.ObjectId;
  slipCode: string;
  qrCode: string;
  createdAt: Date;
}

const slipSchema: Schema = new Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  slipCode: { type: String, required: true },
  qrCode: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<ISlip>('Slip', slipSchema);