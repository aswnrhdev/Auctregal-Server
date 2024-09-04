import { IItem } from '../../entities/IItem';

export interface IItemRepository {
    addItem(itemData: any): Promise<IItem>;
    findItemsByCategory(category: string): Promise<IItem[]>;
    updateItemStatus(itemId: string, status: string): Promise<IItem | null>;
    updateItemToBidding(itemId: string, bidStartTime: Date, bidEndTime: Date): Promise<IItem | null>;
    findItemsByStatus(status: string): Promise<IItem[]>;
    closeBids(currentTime: Date): Promise<any>;
    removeItem(itemId: string): Promise<IItem | null>;
    findUpcomingItems(): Promise<IItem[]>;
    findClosedItems(): Promise<IItem[]>;
    increaseInterestCount(itemId: string): Promise<IItem | null>;
    findBiddingItems(): Promise<IItem[]>;
    findItemById(itemId: string): Promise<IItem | null>;
}