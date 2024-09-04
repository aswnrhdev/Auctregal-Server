import { Model } from 'mongoose';
import { ISlip } from '../../entities/ISlip';
import { ISlipRepository } from '../interface/ISlipRepository';
import { IUser } from '../../entities/UsersEntity';
import { IItem } from '../../entities/IItem';

class SlipRepository implements ISlipRepository {
    constructor(
        private SlipModel: Model<ISlip>,
        private UserModel: Model<IUser>,
        private ItemModel: Model<IItem>
    ) { }

    async findSlipByItemId(itemId: string): Promise<ISlip | null> {
        return this.SlipModel.findOne({ itemId }).exec();
    }

    async createSlip(slipData: Partial<ISlip>): Promise<ISlip> {
        const slip = new this.SlipModel(slipData);
        return slip.save();
    }

    async findUserById(userId: string): Promise<IUser | null> {
        return this.UserModel.findById(userId).select('-password').exec();
    }

    async findItemById(itemId: string): Promise<IItem | null> {
        return this.ItemModel.findById(itemId).exec();
    }

    async getAllSlips(): Promise<ISlip[]> {
        return this.SlipModel.find().select('_id slipCode qrCode userId itemId').exec();
    }

    async findSlipById(slipId: string): Promise<ISlip | null> {
        return this.SlipModel.findById(slipId).exec();
    }

    async findSlipBySlipCode(slipCode: string): Promise<ISlip | null> {
        return this.SlipModel.findOne({ slipCode }).exec();
    }

    async updateUserWalletBalance(userId: string, amount: number): Promise<void> {
        await this.UserModel.findByIdAndUpdate(userId, { $inc: { walletBalance: amount } });
    }

    async updateAdminWalletBalance(amount: number): Promise<void> {
        const adminUser = await this.UserModel.findOne({ role: 'admin' });
        if (adminUser) {
            await this.UserModel.findByIdAndUpdate(adminUser._id, { $inc: { walletBalance: amount } });
        }
    }

    async updateItemStatus(itemId: string, status: string): Promise<void> {
        await this.ItemModel.findByIdAndUpdate(itemId, { $set: { 'transaction.status': status } });
    }

    async updateBidderRefundStatus(itemId: string, bidderId: string): Promise<void> {
        await this.ItemModel.updateOne(
            { _id: itemId, "bidders.userId": bidderId },
            { $set: { "bidders.$.refunded": true } }
        );
    }
}

export default SlipRepository;