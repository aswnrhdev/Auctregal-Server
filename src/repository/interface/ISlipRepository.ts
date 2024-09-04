import { ISlip } from '../../entities/ISlip';
import { IUser } from '../../entities/UsersEntity';
import { IItem } from '../../entities/IItem';

export interface ISlipRepository {
    findSlipByItemId(itemId: string): Promise<ISlip | null>;
    createSlip(slipData: Partial<ISlip>): Promise<ISlip>;
    findUserById(userId: string): Promise<IUser | null>;
    findItemById(itemId: string): Promise<IItem | null>;
    getAllSlips(): Promise<ISlip[]>;
    findSlipById(slipId: string): Promise<ISlip | null>;
    findSlipBySlipCode(slipCode: string): Promise<ISlip | null>;
    updateUserWalletBalance(userId: string, amount: number): Promise<void>;
    updateAdminWalletBalance(amount: number): Promise<void>;
    updateItemStatus(itemId: string, status: string): Promise<void>;
    updateBidderRefundStatus(itemId: string, bidderId: string): Promise<void>;
}