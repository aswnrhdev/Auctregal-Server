import { Request, Response } from 'express';
import UserModel from '../models/usersModel';
import ItemModel from '../models/itemModel';
import SlipModel from '../models/slipModel';

export const getDashboardStats = async (_req: Request, res: Response) => {
    try {
        const totalUsers = await UserModel.countDocuments();
        const totalItems = await ItemModel.countDocuments();
        const totalSlips = await SlipModel.countDocuments();

        const recentUsers = await UserModel.find().sort({ createdAt: -1 }).limit(5);
        const recentItems = await ItemModel.find().sort({ createdAt: -1 }).limit(5);

        const itemsByCategory = await ItemModel.aggregate([
            { $group: { _id: "$category", count: { $sum: 1 } } }
        ]);

        // Fetch admin user
        const admin = await UserModel.findOne({ role: 'admin' });

        if (!admin) {
            return res.status(404).json({ message: 'Admin user not found' });
        }

        // Fetch wallet balance changes
        const walletChanges = await UserModel.aggregate([
            { $match: { _id: admin._id } },
            { $unwind: "$walletHistory" },
            {
                $group: {
                    _id: {
                        year: { $year: "$walletHistory.date" },
                        month: { $month: "$walletHistory.date" }
                    },
                    netChange: { $sum: "$walletHistory.amount" }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]);

        res.json({
            totalUsers,
            totalItems,
            totalSlips,
            recentUsers,
            recentItems,
            itemsByCategory,
            walletChanges
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ message: 'Error fetching dashboard stats' });
    }
};