import { IUser } from '../../entities/UsersEntity';
import { IItem } from '../../entities/IItem';

export interface IBiddingRepository {
    findUserByEmail(email: string): Promise<IUser | null>;
    findUserById(userId: string): Promise<IUser | null>;
    findItemById(itemId: string): Promise<IItem | null>;
    findExistingToken(itemId: string, userId: string): Promise<boolean>;
    updateAdminWallet(amount: number): Promise<void>;
    addBiddingToken(itemId: string, tokenData: any): Promise<void>;
    findBiddingToken(itemId: string, token: string): Promise<any>;
    updateItemPrice(itemId: string, newPrice: number): Promise<void>;
    updateOrAddBidder(itemId: string, bidderData: any): Promise<void>;
    getWinningBidder(itemId: string): Promise<any>;
    initializeTransaction(itemId: string, transactionData: any): Promise<void>;
    updateTransactionPayment(itemId: string, paidAmount: number, paymentHistoryEntry: any): Promise<void>;
    getTransaction(itemId: string): Promise<any>;
    completeTransaction(itemId: string): Promise<void>;
}