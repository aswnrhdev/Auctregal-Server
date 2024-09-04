import { Model } from 'mongoose';
import { IItemRepository } from '../interface/IItemRepository';
import { IItem } from '../../entities/IItem';

class ItemRepository implements IItemRepository {
    constructor(private ItemModel: Model<IItem>) {}

    async addItem(itemData: any): Promise<IItem> {
        const newItem = new this.ItemModel(itemData);
        return await newItem.save();
    }

    async findItemsByCategory(category: string): Promise<IItem[]> {
        return await this.ItemModel.find({ category, currentStatus: 'none' }).exec();
    }

    async updateItemStatus(itemId: string, status: string): Promise<IItem | null> {
        return await this.ItemModel.findByIdAndUpdate(
            itemId,
            { currentStatus: status },
            { new: true }
        ).exec();
    }

    async updateItemToBidding(itemId: string, bidStartTime: Date, bidEndTime: Date): Promise<IItem | null> {
        return await this.ItemModel.findByIdAndUpdate(
            itemId,
            { 
                currentStatus: 'bidding',
                bidStartTime,
                bidEndTime,
                bidStatus: 'active'
            },
            { new: true }
        ).exec();
    }

    async findItemsByStatus(status: string): Promise<IItem[]> {
        return await this.ItemModel.find({ currentStatus: status }).exec();
    }

    async closeBids(currentTime: Date): Promise<any> {
        return await this.ItemModel.updateMany(
            { bidEndTime: { $lte: currentTime }, bidStatus: 'active' },
            { $set: { bidStatus: 'ended', currentStatus: 'closed' } }
        ).exec();
    }

    async removeItem(itemId: string): Promise<IItem | null> {
        return await this.ItemModel.findByIdAndDelete(itemId).exec();
    }

    async findUpcomingItems(): Promise<IItem[]> {
        return await this.ItemModel.find({ currentStatus: 'upcoming' }).exec();
    }

    async findClosedItems(): Promise<IItem[]> {
        return await this.ItemModel.find({ currentStatus: 'closed' }).exec();
    }

    async increaseInterestCount(itemId: string): Promise<IItem | null> {
        return await this.ItemModel.findByIdAndUpdate(
            itemId,
            { $inc: { interestCount: 1 } },
            { new: true }
        ).exec();
    }

    async findBiddingItems(): Promise<IItem[]> {
        return await this.ItemModel.find({ currentStatus: 'bidding' }).exec();
    }

    async findItemById(itemId: string): Promise<IItem | null> {
        return await this.ItemModel.findById(itemId).exec();
    }
}

export default ItemRepository;