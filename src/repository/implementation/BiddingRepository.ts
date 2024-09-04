import { Model } from 'mongoose';
import { IBiddingRepository } from '../interface/IBiddingRepository';
import { IUser } from '../../entities/UsersEntity';
import { IItem } from '../../entities/IItem';

class BiddingRepository implements IBiddingRepository {
    constructor(
        private UserModel: Model<IUser>,
        private ItemModel: Model<IItem>
    ) { }

    async findUserByEmail(email: string): Promise<IUser | null> {
        return this.UserModel.findOne({ email }).exec();
    }

    async findUserById(userId: string): Promise<IUser | null> {
        return this.UserModel.findById(userId).exec();
    }

    async findItemById(itemId: string): Promise<IItem | null> {
        return this.ItemModel.findById(itemId).exec();
    }

    async findExistingToken(itemId: string, userId: string): Promise<boolean> {
        const item = await this.ItemModel.findOne({
            _id: itemId,
            'biddingTokens.userId': userId
        }).exec();
        return !!item;
    }

    async updateAdminWallet(amount: number): Promise<void> {
        await this.UserModel.findOneAndUpdate(
            { role: 'admin' },
            { $inc: { wallet: amount } }
        ).exec();
    }

    async addBiddingToken(itemId: string, tokenData: any): Promise<void> {
        await this.ItemModel.findByIdAndUpdate(
            itemId,
            { $push: { biddingTokens: tokenData } }
        ).exec();
    }

    async findBiddingToken(itemId: string, token: string): Promise<any> {
        const item = await this.ItemModel.findOne({
            _id: itemId,
            'biddingTokens.token': token
        }).exec();
        return item ? item.biddingTokens.find((t: any) => t.token === token) : null;
    }

    async updateItemPrice(itemId: string, newPrice: number): Promise<void> {
        await this.ItemModel.findByIdAndUpdate(
            itemId,
            { $set: { currentPrice: newPrice } },
            { new: true }
        ).exec();
    }

    async updateOrAddBidder(itemId: string, bidderData: any): Promise<void> {
        await this.ItemModel.findOneAndUpdate(
            { _id: itemId, 'bidders.userId': bidderData.userId },
            { 
                $set: { 
                    'bidders.$.bidAmount': bidderData.bidAmount,
                    'bidders.$.bidTime': bidderData.bidTime
                }
            },
            { new: true }
        ).exec() || await this.ItemModel.findByIdAndUpdate(
            itemId,
            { $push: { bidders: bidderData } }
        ).exec();
    }

    async getWinningBidder(itemId: string): Promise<any> {
        const item = await this.ItemModel.findById(itemId).exec();
        if (!item || !item.bidders || item.bidders.length === 0) return null;
        return item.bidders.reduce((prev, current) => 
            (prev.bidAmount > current.bidAmount) ? prev : current
        );
    }

    async initializeTransaction(itemId: string, transactionData: any): Promise<void> {
        await this.ItemModel.findByIdAndUpdate(
            itemId,
            { $set: { transaction: transactionData } }
        ).exec();
    }

    async updateTransactionPayment(itemId: string, paidAmount: number, paymentHistoryEntry: any): Promise<void> {
        await this.ItemModel.findOneAndUpdate(
            { _id: itemId },
            { 
                $inc: { 'transaction.paidAmount': paidAmount },
                $push: { 'transaction.paymentHistory': paymentHistoryEntry }
            }
        ).exec();
    }

    async getTransaction(itemId: string): Promise<any> {
        const item = await this.ItemModel.findById(itemId).exec();
        return item ? item.transaction : null;
    }

    async completeTransaction(itemId: string): Promise<void> {
        await this.ItemModel.findOneAndUpdate(
            { _id: itemId },
            { 
                $set: { 
                    'transaction.status': 'completed',
                    'transaction.completedAt': new Date()
                }
            }
        ).exec();
    }
}

export default BiddingRepository;