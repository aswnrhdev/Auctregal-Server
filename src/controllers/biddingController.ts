import { Request, Response } from "express";
import { IBiddingRepository } from "../repository/interface/IBiddingRepository";
import Stripe from 'stripe';
import crypto from 'crypto';
import BiddingRepository from "../repository/implementation/BiddingRepository";
import UserModel from "../models/usersModel";
import ItemModel from "../models/itemModel";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
    apiVersion: '2024-06-20',
});

const MAX_PAYMENT_AMOUNT = 1999999;

export class BiddingController {
    constructor(private biddingRepository: IBiddingRepository) { }

    private generateBiddingTokenString = (): string => {
        return crypto.randomBytes(4).toString('hex').toUpperCase();
    };

    generateBiddingToken = async (req: Request, res: Response): Promise<void> => {
        try {
            const { email, itemId } = req.body;

            const user = await this.biddingRepository.findUserByEmail(email);
            if (!user) {
                res.status(404).json({ message: 'User not found' });
                return;
            }

            const item = await this.biddingRepository.findItemById(itemId);
            if (!item) {
                res.status(404).json({ message: 'Item not found' });
                return;
            }

            const existingToken = await this.biddingRepository.findExistingToken(itemId, user._id.toString());
            if (existingToken) {
                res.status(400).json({ message: 'You already have a bidding token for this item' });
                return;
            }

            const tokenAmount = item.basePrice * 0.1;

            const description = `Bidding token for item ${item.name} (${item._id})`;
            const shipping = {
                name: user.name,
                address: {
                    line1: '456 Another Street',
                    city: 'Delhi',
                    state: 'Delhi',
                    postal_code: '110001',
                    country: 'IN',
                },
            };

            const paymentIntent = await stripe.paymentIntents.create({
                amount: Math.round(tokenAmount * 100),
                currency: 'inr',
                payment_method_types: ['card'],
                metadata: { userId: user._id.toString(), itemId: item._id.toString() },
                description,
                shipping,
            });

            res.status(200).json({
                clientSecret: paymentIntent.client_secret,
                amount: tokenAmount
            });

        } catch (error) {
            console.error('Error generating bidding token:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    };

    confirmBiddingToken = async (req: Request, res: Response): Promise<void> => {
        try {
            const { paymentIntentId } = req.body;

            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
            if (paymentIntent.status !== 'succeeded') {
                res.status(400).json({ message: 'Payment not successful' });
                return;
            }

            const { userId, itemId } = paymentIntent.metadata;

            const user = await this.biddingRepository.findUserById(userId);
            const item = await this.biddingRepository.findItemById(itemId);

            if (!user || !item) {
                res.status(404).json({ message: 'User or Item not found' });
                return;
            }

            const tokenAmount = item.basePrice * 0.1;
            await this.biddingRepository.updateAdminWallet(tokenAmount);

            const token = this.generateBiddingTokenString();
            const expiresAt = new Date(item.bidEndTime);

            await this.biddingRepository.addBiddingToken(itemId, {
                userId: user._id,
                token,
                expiresAt
            });

            res.status(200).json({ message: 'Bidding token generated successfully', token });

        } catch (error) {
            console.error('Error confirming bidding token:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    };

    validateBiddingToken = async (req: Request, res: Response) => {
        try {
            const { itemId, token, email } = req.body;
            const item = await this.biddingRepository.findItemById(itemId);
            if (!item) {
                return res.status(404).json({ isValid: false, message: 'Item not found' });
            }

            const tokenEntry = await this.biddingRepository.findBiddingToken(itemId, token);
            if (!tokenEntry) {
                return res.status(400).json({ isValid: false, message: 'Invalid token' });
            }

            const user = await this.biddingRepository.findUserByEmail(email);
            if (!user || user._id.toString() !== tokenEntry.userId.toString()) {
                return res.status(400).json({ isValid: false, message: 'Token does not belong to this user' });
            }

            if (new Date() > tokenEntry.expiresAt) {
                return res.status(400).json({ isValid: false, message: 'Token has expired' });
            }

            res.json({ isValid: true });
        } catch (error) {
            console.error('Error validating bidding token:', error);
            res.status(500).json({ isValid: false, message: 'Internal server error' });
        }
    };

    placeBid = async (req: Request, res: Response) => {
        try {
            const { itemId, token, email, bidAmount } = req.body;
            const item = await this.biddingRepository.findItemById(itemId);
            if (!item) {
                return res.status(404).json({ success: false, message: 'Item not found' });
            }

            const tokenEntry = await this.biddingRepository.findBiddingToken(itemId, token);
            if (!tokenEntry) {
                return res.status(400).json({ success: false, message: 'Invalid token' });
            }

            const user = await this.biddingRepository.findUserByEmail(email);
            if (!user || user._id.toString() !== tokenEntry.userId.toString()) {
                return res.status(400).json({ success: false, message: 'Token does not belong to this user' });
            }

            if (new Date() > tokenEntry.expiresAt) {
                return res.status(400).json({ success: false, message: 'Token has expired' });
            }

            if (bidAmount <= item.currentPrice) {
                return res.status(400).json({ success: false, message: 'Bid amount must be higher than the current price' });
            }

            await this.biddingRepository.updateItemPrice(itemId, bidAmount);
            await this.biddingRepository.updateOrAddBidder(itemId, {
                userId: user._id,
                name: user.name,
                email: user.email,
                bidAmount: bidAmount,
                bidTime: new Date()
            });

            res.json({ success: true, message: 'Bid placed successfully', newCurrentPrice: bidAmount });
        } catch (error) {
            console.error('Error placing bid:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    };

    private getDummyAddress = () => ({
        line1: '123 Test Street',
        line2: 'Apartment 4B',
        city: 'Mumbai',
        state: 'Maharashtra',
        postal_code: '400001',
        country: 'IN',
    });

    completeAuctionPayment = async (req: Request, res: Response): Promise<void> => {
        try {
            const { itemId, email } = req.body;

            const item = await this.biddingRepository.findItemById(itemId);
            const user = await this.biddingRepository.findUserByEmail(email);

            if (!item || !user) {
                res.status(404).json({ message: 'Item or User not found' });
                return;
            }

            const winningBidder = await this.biddingRepository.getWinningBidder(itemId);

            if (winningBidder.email !== email) {
                res.status(400).json({ message: 'You are not the winning bidder' });
                return;
            }

            const totalAmount = item.currentPrice - (item.basePrice * 0.1);
            const paymentSteps = [];
            let remainingAmount = totalAmount;

            const MIN_PAYMENT_AMOUNT = 0.5;

            while (remainingAmount > 0) {
                const stepAmount = Math.max(Math.min(remainingAmount, MAX_PAYMENT_AMOUNT), MIN_PAYMENT_AMOUNT);
                const paymentIntent = await stripe.paymentIntents.create({
                    amount: Math.round(stepAmount * 100),
                    currency: 'inr',
                    payment_method_types: ['card'],
                    metadata: { userId: user._id.toString(), itemId: item._id.toString() },
                    description: `Payment step for item ${item.title} (${item._id})`,
                    shipping: {
                        name: user.name || 'Test Customer',
                        address: this.getDummyAddress(),
                    },
                });

                paymentSteps.push({
                    amount: stepAmount,
                    clientSecret: paymentIntent.client_secret,
                });

                remainingAmount -= stepAmount;
            }

            await this.biddingRepository.initializeTransaction(itemId, {
                status: 'pending',
                paymentIntentId: paymentSteps[0].clientSecret?.split('_secret_')[0] || '',
                finalAmount: totalAmount,
                paidAmount: 0,
                paymentHistory: []
            });

            res.status(200).json({ paymentSteps });

        } catch (error) {
            console.error('Error initiating auction payment:', error);
            res.status(500).json({ message: 'Internal server error', error: (error as Error).message });
        }
    };

    confirmAuctionPayment = async (req: Request, res: Response): Promise<void> => {
        try {
            const { paymentIntentId, itemId, email } = req.body;
            console.log('Received paymentIntentId:', paymentIntentId);

            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
            if (paymentIntent.status !== 'succeeded') {
                res.status(400).json({ message: 'Payment not successful' });
                return;
            }

            const item = await this.biddingRepository.findItemById(itemId);
            const user = await this.biddingRepository.findUserByEmail(email);

            if (!item || !user) {
                res.status(404).json({ message: 'Item or User not found' });
                return;
            }

            if (!item.transaction) {
                res.status(400).json({ message: 'Transaction not found' });
                return;
            }

            const paidAmount = paymentIntent.amount / 100;
            await this.biddingRepository.updateTransactionPayment(itemId, paidAmount, {
                amount: paidAmount,
                paymentIntentId: paymentIntentId,
                paidAt: new Date()
            });

            const updatedTransaction = await this.biddingRepository.getTransaction(itemId);

            if (updatedTransaction.paidAmount >= updatedTransaction.finalAmount) {
                await this.biddingRepository.completeTransaction(itemId);
                await this.biddingRepository.updateAdminWallet(updatedTransaction.finalAmount);

                res.status(200).json({
                    message: 'All payments completed',
                    redirectTo: '/checkout',
                    paymentCompleted: true
                });
            } else {
                const remainingAmount = updatedTransaction.finalAmount - updatedTransaction.paidAmount;
                const MIN_PAYMENT_AMOUNT = 0.5;
                const nextStepAmount = Math.max(Math.min(remainingAmount, MAX_PAYMENT_AMOUNT), MIN_PAYMENT_AMOUNT);
                const nextPaymentIntent = await stripe.paymentIntents.create({
                    amount: Math.round(nextStepAmount * 100),
                    currency: 'inr',
                    payment_method_types: ['card'],
                    metadata: { userId: user._id.toString(), itemId: item._id.toString() },
                    description: `Next payment step for item ${item.title} (${item._id})`,
                    shipping: {
                        name: user.name || 'Test Customer',
                        address: this.getDummyAddress(),
                    },
                });

                res.status(200).json({
                    message: 'Payment step completed',
                    nextStep: {
                        amount: nextStepAmount,
                        clientSecret: nextPaymentIntent.client_secret,
                    },
                    paymentHistory: updatedTransaction.paymentHistory,
                    paymentCompleted: false
                });
            }

        } catch (error) {
            console.error('Error confirming auction payment:', error);
            res.status(500).json({ message: 'Internal server error', error: (error as Error).message });
        }
    };
}

const biddingRepository = new BiddingRepository(UserModel, ItemModel);
const biddingController = new BiddingController(biddingRepository);

export const generateBiddingToken = biddingController.generateBiddingToken;
export const confirmBiddingToken = biddingController.confirmBiddingToken;
export const validateBiddingToken = biddingController.validateBiddingToken;
export const placeBid = biddingController.placeBid;
export const completeAuctionPayment = biddingController.completeAuctionPayment;
export const confirmAuctionPayment = biddingController.confirmAuctionPayment;