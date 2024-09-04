
import mongoose, { Schema, Model, Types } from "mongoose";
import { IItem } from "../entities/IItem";

const categoryFields: Record<string, string[]> = {
  'Art and Antiques': ['Title', 'Artist', 'Year', 'Medium', 'Dimensions', 'Condition', 'Provenance', 'Base Price', 'Current Price'],
  'Jewelry and Watches': ['Title', 'Brand', 'Material', 'Gemstone', 'Carat Weight', 'Condition', 'Certification', 'Base Price', 'Current Price'],
  'Collectables': ['Title', 'Type', 'Era', 'Condition', 'Rarity', 'Manufacturer', 'Base Price', 'Current Price'],
  'Vehicles': ['Make', 'Model', 'Year', 'Mileage', 'Condition', 'VIN', 'Color', 'Base Price', 'Current Price'],
  'Wine and Spirits': ['Name', 'Type', 'Vintage', 'Region', 'ABV', 'Bottle Size', 'Condition', 'Base Price', 'Current Price'],
  'Rare Books and Manuscripts': ['Title', 'Author', 'Year', 'Edition', 'Condition', 'Publisher', 'Language', 'Base Price', 'Current Price']
};

interface IBidder {
  userId: Types.ObjectId;
  name: string;
  email: string;
  bidAmount: number;
  bidTime: Date;
  refunded: boolean; // Add this line
}

const itemSchema = new Schema<IItem>(
  {
    category: { type: String, required: true },
    currentStatus: { type: String, default: 'none' },
    interestCount: { type: Number, default: 0 },
    primaryImage: { type: String, required: true },
    secondaryImages: [{ type: String }],
    basePrice: { type: Number, required: false },
    currentPrice: { type: Number, required: false },
    bidStartTime: { type: Date },
    bidEndTime: { type: Date },
    bidStatus: { type: String, enum: ['none', 'upcoming', 'active', 'ended'], default: 'none' },
    description: { type: String },
    title: { type: String },
    artist: { type: String },
    year: { type: String },
    medium: { type: String },
    dimensions: { type: String },
    condition: { type: String },
    provenance: { type: String },
    brand: { type: String },
    material: { type: String },
    gemstone: { type: String },
    caratWeight: { type: String },
    certification: { type: String },
    type: { type: String },
    era: { type: String },
    rarity: { type: String },
    manufacturer: { type: String },
    make: { type: String },
    model: { type: String },
    mileage: { type: String },
    vin: { type: String },
    color: { type: String },
    name: { type: String },
    vintage: { type: String },
    region: { type: String },
    abv: { type: String },
    bottleSize: { type: String },
    author: { type: String },
    edition: { type: String },
    publisher: { type: String },
    language: { type: String },
    biddingTokens: [{
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      token: { type: String },
      expiresAt: { type: Date }
    }],
    bidders: [{
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      name: { type: String },
      email: { type: String },
      bidAmount: { type: Number },
      bidTime: { type: Date },
      refunded: { type: Boolean, default: false } // Add this line
    }],
    transaction: {
      status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
      paymentIntentId: { type: String },
      finalAmount: { type: Number },
      paidAmount: { type: Number, default: 0 },
      completedAt: { type: Date },
      paymentHistory: [{
        amount: { type: Number },
        paymentIntentId: { type: String },
        paidAt: { type: Date, default: Date.now }
      }]
    }
  },
  { timestamps: true }
);

const existingFields = Object.keys(itemSchema.paths);

const allCategoryFields = new Set<string>();
Object.values(categoryFields).forEach(fields => fields.forEach(field => allCategoryFields.add(field)));

allCategoryFields.forEach(field => {
  const camelCaseField = field.charAt(0).toLowerCase() + field.slice(1).replace(/\s+/g, '');
  if (!existingFields.includes(camelCaseField)) {
    itemSchema.add({ [camelCaseField]: { type: String } });
  }
});

const ItemModel: Model<IItem> = mongoose.model<IItem>('Item', itemSchema);

export default ItemModel;