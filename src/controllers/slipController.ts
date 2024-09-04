import { Request, Response } from 'express';
import QRCode from 'qrcode';
import { sendSlipEmail } from '../services/emailService';
import S3Uploader from '../services/s3Bucket';
import { ISlipRepository } from '../repository/interface/ISlipRepository';
import SlipRepository from '../repository/implementation/ISlipRepository';
import slipModel from '../models/slipModel';
import UserModel from '../models/usersModel';
import ItemModel from '../models/itemModel';

const S3 = new S3Uploader();

export class SlipController {
    constructor(private slipRepository: ISlipRepository) { }

    getCheckoutData = async (req: Request, res: Response) => {
        try {
            const { userId, itemId } = req.query;

            const user = await this.slipRepository.findUserById(userId as string);
            const item = await this.slipRepository.findItemById(itemId as string);
            const slip = await this.slipRepository.findSlipByItemId(itemId as string);

            if (!user || !item) {
                return res.status(404).json({ message: 'User or Item not found' });
            }

            let imageUrl = '';
            if (item.primaryImage) {
                try {
                    imageUrl = await S3.retrieveFile(item.primaryImage);
                } catch (error) {
                    console.error('Error fetching image:', error);
                }
            }

            const checkoutData = {
                userData: {
                    name: user.name,
                    email: user.email,
                    auctCode: user.auctCode || 'N/A'
                },
                itemData: {
                    title: item.title,
                    category: item.category,
                    basePrice: item.basePrice,
                    currentPrice: item.currentPrice,
                    transactionStatus: item.transaction?.status || 'N/A',
                    primaryImage: imageUrl
                },
                slipData: slip ? {
                    slipCode: slip.slipCode,
                    qrCode: slip.qrCode
                } : null
            };

            res.status(200).json(checkoutData);
        } catch (error) {
            console.error('Error fetching checkout data:', error);
            res.status(500).json({ message: 'Error fetching checkout data' });
        }
    };

    generateSlip = async (req: Request, res: Response) => {
        try {
            const { userId, itemId } = req.body;

            const user = await this.slipRepository.findUserById(userId);
            const item = await this.slipRepository.findItemById(itemId);

            if (!user || !item) {
                return res.status(404).json({ message: 'User or Item not found' });
            }

            let existingSlip = await this.slipRepository.findSlipByItemId(itemId);

            if (existingSlip) {
                return res.status(200).json({
                    message: 'Slip already exists',
                    slip: {
                        slipCode: existingSlip.slipCode,
                        qrCode: existingSlip.qrCode,
                    },
                    userData: {
                        name: user.name,
                        email: user.email
                    },
                    itemData: {
                        title: item.title,
                        price: item.currentPrice
                    },
                });
            }

            const slipCode = Math.floor(1000 + Math.random() * 9000).toString();
            const slipData = {
                userId: user._id,
                itemId: item._id,
                userEmail: user.email,
                userName: user.name,
                itemTitle: item.title,
                itemPrice: item.currentPrice,
                slipCode,
            };

            const qrCodeData = await QRCode.toDataURL(JSON.stringify(slipData));

            const newSlip = await this.slipRepository.createSlip({
                userId: user._id,
                itemId: item._id,
                slipCode,
                qrCode: qrCodeData,
            });

            await sendSlipEmail(user.email, qrCodeData, slipData);

            res.status(200).json({
                message: 'Slip generated successfully',
                slip: {
                    slipCode: newSlip.slipCode,
                    qrCode: newSlip.qrCode,
                },
                userData: {
                    name: user.name,
                    email: user.email
                },
                itemData: {
                    title: item.title,
                    price: item.currentPrice
                },
            });
        } catch (error) {
            console.error('Error generating slip:', error);
            res.status(500).json({ message: 'Error generating slip' });
        }
    };

    getSlipByItemId = async (req: Request, res: Response) => {
        try {
            const { itemId } = req.params;
            const slip = await this.slipRepository.findSlipByItemId(itemId);

            if (!slip) {
                return res.status(404).json({ message: 'Slip not found' });
            }

            res.status(200).json({
                slip: {
                    slipCode: slip.slipCode,
                    qrCode: slip.qrCode,
                }
            });
        } catch (error) {
            console.error('Error fetching slip:', error);
            res.status(500).json({ message: 'Error fetching slip' });
        }
    };

    getItem = async (req: Request, res: Response) => {
        try {
            const item = await this.slipRepository.findItemById(req.params.itemId);
            if (!item) {
                return res.status(404).json({ message: 'Item not found' });
            }
            res.json(item);
        } catch (error) {
            res.status(500).json({ message: 'Server error' });
        }
    };

    getUser = async (req: Request, res: Response) => {
        try {
            const user = await this.slipRepository.findUserById(req.params.userId);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            res.json(user);
        } catch (error) {
            res.status(500).json({ message: 'Server error' });
        }
    };

    getAllSlips = async (req: Request, res: Response) => {
        try {
            const slips = await this.slipRepository.getAllSlips();
            const slipsWithDetails = await Promise.all(slips.map(async (slip) => {
                let user = null;
                let item = null;

                if (slip.userId) {
                    user = await this.slipRepository.findUserById(slip.userId.toString());
                }
                if (slip.itemId) {
                    item = await this.slipRepository.findItemById(slip.itemId.toString());
                }

                return {
                    _id: slip._id,
                    slipCode: slip.slipCode,
                    qrCode: slip.qrCode,
                    userId: slip.userId,
                    itemId: slip.itemId,
                    userName: user?.name || 'Unknown',
                    itemTitle: item?.title || 'Unknown'
                };
            }));
            res.status(200).json(slipsWithDetails);
        } catch (error) {
            console.error('Error fetching slips:', error);
            res.status(500).json({ message: 'Error fetching slips' });
        }
    };

    getSlipDetails = async (req: Request, res: Response) => {
        try {
            const { slipId } = req.params;
            const slip = await this.slipRepository.findSlipById(slipId);
            if (!slip) {
                return res.status(404).json({ message: 'Slip not found' });
            }

            let user = null;
            let item = null;

            if (slip.userId) {
                user = await this.slipRepository.findUserById(slip.userId.toString());
            }
            if (slip.itemId) {
                item = await this.slipRepository.findItemById(slip.itemId.toString());
            }

            if (!user || !item) {
                return res.status(404).json({ message: 'User or Item not found' });
            }

            let imageUrl = '';
            if (item.primaryImage) {
                try {
                    imageUrl = await S3.retrieveFile(item.primaryImage);
                } catch (error) {
                    console.error('Error fetching image:', error);
                }
            }

            const slipDetails = {
                slipCode: slip.slipCode,
                qrCode: slip.qrCode,
                user: {
                    name: user.name,
                    email: user.email
                },
                item: {
                    title: item.title,
                    category: item.category,
                    basePrice: item.basePrice,
                    currentPrice: item.currentPrice,
                    description: item.description,
                    transactionStatus: item.transaction?.status || 'N/A',
                    primaryImage: imageUrl,
                    paymentHistory: item.transaction?.paymentHistory || [],
                    bidders: item.bidders || []
                }
            };

            res.status(200).json(slipDetails);
        } catch (error) {
            console.error('Error fetching slip details:', error);
            res.status(500).json({ message: 'Error fetching slip details' });
        }
    };


    processRefund = async (req: Request, res: Response) => {
        try {
            const { slipCode } = req.params;
    
            if (!slipCode) {
                return res.status(400).json({ message: 'Invalid slip code' });
            }
    
            const slip = await this.slipRepository.findSlipBySlipCode(slipCode);
    
            if (!slip) {
                return res.status(404).json({ message: 'Slip not found' });
            }
    
            const item = await this.slipRepository.findItemById(slip.itemId.toString());
    
            if (!item) {
                return res.status(404).json({ message: 'Item not found' });
            }
    
            if (!item.bidders || item.bidders.length === 0) {
                return res.status(400).json({ message: 'No bidders found for this item' });
            }

            const sortedBidders = item.bidders.sort((a, b) => b.bidAmount - a.bidAmount);
            const winningBidder = sortedBidders[0];
    
            const failedBidders = sortedBidders.slice(1);
    
            if (failedBidders.length === 0) {
                return res.status(400).json({ message: 'No failed bidders to refund' });
            }
    
            const refundAmount = item.basePrice * 0.1; 
            let totalRefundAmount = 0;
    
            for (const bidder of failedBidders) {
                if (bidder.userId) {
                    await this.slipRepository.updateUserWalletBalance(bidder.userId.toString(), refundAmount);
                    totalRefundAmount += refundAmount;

                    await this.slipRepository.updateBidderRefundStatus(item._id.toString(), bidder.userId.toString());
                }
            }

            await this.slipRepository.updateAdminWalletBalance(-totalRefundAmount);
    
            await this.slipRepository.updateItemStatus(item._id.toString(), 'refunded');
    
            res.status(200).json({ 
                message: 'Refund processed successfully',
                refundDetails: {
                    totalRefundAmount,
                    numberOfBiddersRefunded: failedBidders.length,
                    refundAmountPerBidder: refundAmount
                }
            });
        } catch (error: any) {
            console.error('Error processing refund:', error);
            res.status(500).json({ message: 'Error processing refund', error: error.message });
        }
    };
}

const slipRepository = new SlipRepository(slipModel, UserModel, ItemModel);
const slipController = new SlipController(slipRepository);

export const getCheckoutData = slipController.getCheckoutData;
export const generateSlip = slipController.generateSlip;
export const getSlipByItemId = slipController.getSlipByItemId;
export const getItem = slipController.getItem;
export const getUser = slipController.getUser;
export const getAllSlips = slipController.getAllSlips;
export const getSlipDetails = slipController.getSlipDetails;
export const processRefund = slipController.processRefund

export default SlipController;