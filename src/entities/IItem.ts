
import mongoose, { Document } from "mongoose";

interface BiddingToken {
  userId: mongoose.Types.ObjectId;
  token: string;
  expiresAt: Date;
}

interface Bid {
  user: mongoose.Types.ObjectId;
  amount: number;
  createdAt: Date;
}



interface Transaction {
  status: "pending" | "completed";
  paymentIntentId: string;
  finalAmount: number;
  paidAmount: number;
  completedAt?: Date;
  paymentHistory: PaymentHistoryItem[];
}

interface PaymentHistoryItem {
  amount: number;
  paymentIntentId: string;
  paidAt: Date;
}

// export interface IItem {
//   _id: mongoose.Types.ObjectId;
//   category: string;
//   currentStatus: string;
//   interestCount: number;
//   primaryImage: string;
//   secondaryImages: string[];
//   basePrice: number;
//   currentPrice: number;
//   bidStartTime: Date;
//   bidEndTime: Date;
//   description: string;
//   bidStatus: "none" | "upcoming" | "active" | "ended";
//   title?: string;
//   artist?: string;
//   year?: string;
//   medium?: string;
//   dimensions?: string;
//   condition?: string;
//   provenance?: string;
//   brand?: string;
//   material?: string;
//   gemstone?: string;
//   caratWeight?: string;
//   certification?: string;
//   type?: string;
//   era?: string;
//   rarity?: string;
//   manufacturer?: string;
//   make?: string;
//   model?: string;
//   mileage?: string;
//   vin?: string;
//   color?: string;
//   name?: string;
//   vintage?: string;
//   region?: string;
//   abv?: string;
//   bottleSize?: string;
//   author?: string;
//   edition?: string;
//   publisher?: string;
//   language?: string;
//   biddingTokens: BiddingToken[];
//   bidders: IBidder[];
//   transaction: Transaction; 
//   bids: Bid[];
//   createdAt?: Date;
//   updatedAt?: Date;
// }


export interface IItem extends Document {
  _id: mongoose.Types.ObjectId;
  category: string;
  currentStatus: string;
  interestCount: number;
  primaryImage: string;
  secondaryImages: string[];
  basePrice: number;
  currentPrice: number;
  bidStartTime: Date;
  bidEndTime: Date;
  description: string;
  bidStatus: "none" | "upcoming" | "active" | "ended";
  title?: string;
  artist?: string;
  year?: string;
  medium?: string;
  dimensions?: string;
  condition?: string;
  provenance?: string;
  brand?: string;
  material?: string;
  gemstone?: string;
  caratWeight?: string;
  certification?: string;
  type?: string;
  era?: string;
  rarity?: string;
  manufacturer?: string;
  make?: string;
  model?: string;
  mileage?: string;
  vin?: string;
  color?: string;
  name?: string;
  vintage?: string;
  region?: string;
  abv?: string;
  bottleSize?: string;
  author?: string;
  edition?: string;
  publisher?: string;
  language?: string;
  biddingTokens: BiddingToken[];
  bidders: IBidder[];
  transaction: Transaction; 
  bids: Bid[];
  createdAt?: Date;
  updatedAt?: Date;
}