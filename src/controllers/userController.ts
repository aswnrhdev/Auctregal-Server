import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import UserRepository from '../repository/implementation/UserRepository';
import { IUserRepository } from '../repository/interface/IUserRepository';
import { requestOtp } from '../services/otp';
import OtpRepository from '../repository/implementation/OtpRepository';
import { IOtpUserRepository } from '../repository/interface/IOtpRepository';
import { TokenPayload } from '../entities/types';
import { sendPaymentConfirmationEmail } from '../services/emailService';
import path from 'path';
import Stripe from 'stripe';
import crypto from 'crypto';
import UserModel from '../models/usersModel';
import ItemModel from '../models/itemModel';


import S3Uploader from '../services/s3Bucket';
const s3Uploader = new S3Uploader();

let userRepository: IUserRepository = new UserRepository();
let otpRepository: IOtpUserRepository = new OtpRepository();

const SALT_ROUNDS = 10;
const SECRET_KEY: string = process.env.SECRET_KEY || 'defaultSecretKey';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
    apiVersion: '2024-06-20',
});

const generateAuctCode = () => {
    return crypto.randomBytes(6).toString('hex').toUpperCase();
};

const generateUniqueAuctCode = async (): Promise<string> => {
    let auctCode: string;
    let isUnique: boolean;

    do {
        auctCode = generateAuctCode();
        isUnique = await userRepository.isAuctCodeUnique(auctCode);
    } while (!isUnique);

    return auctCode;
};


const signup = async (req: Request, res: Response) => {
    try {
        const { isGoogle, password, ...userData } = req.body;
        console.log(req.body);

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        let newUser;

        const auctCode = await generateUniqueAuctCode();

        if (isGoogle) {
            newUser = await userRepository.createUser({
                ...userData,
                password: hashedPassword,
                role: 'bidder',
                bidderScore: 100,
                verified: true,
                auctCode
            });
        } else {
            newUser = await userRepository.createUser({
                ...userData,
                password: hashedPassword,
                role: 'bidder',
                bidderScore: 100,
                auctCode
            });

            await requestOtp(userData.email);
        }

        res.status(201).json(newUser);
    } catch (error: any) {
        console.error('Error during signup:', error);
        res.status(500).json({ message: error.message });
    }
};



const verifyOtp = async (req: Request, res: Response) => {
    try {
        const { otp, email } = req.body;

        if (!otp || !email) {
            return res.status(400).json({ message: 'OTP and email are required' });
        }

        const otpRecord = await otpRepository.findOtpByEmail(email);
        const user = await otpRepository.findUserByEmail(email);

        if (otpRecord && otpRecord.otp === otp) {
            if (user) {
                await otpRepository.markUserAsVerified(email);
            }

            await otpRepository.updateOtpStatus(email);

            return res.status(200).json({ message: 'OTP verified successfully' });
        } else {
            return res.status(400).json({ message: 'Invalid OTP' });
        }
    } catch (error) {
        console.error('Error verifying OTP:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

const resendOtp = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const user = await userRepository.verifyUser(email);

        if (!user) {
            return res.status(401).json({ message: 'Please enter a valid email.' });
        }

        if (user.verified) {
            return res.status(400).json({ message: 'User is already verified.' });
        }

        await requestOtp(email);

        return res.status(200).json({ message: 'OTP has been resent successfully' });
    } catch (error) {
        console.error('Error resending OTP:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

const verifyLogin = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        console.log(email);
        

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const user = await userRepository.verifyUser(email);

        if (!user) {
            return res.status(401).json({ message: 'Please enter a valid email.' });
        }

        const isPasswordValid = await userRepository.checkPassword(user, password);

        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Incorrect password. Please try again.' });
        }

        if (user.isBlocked) {
            return res.status(403).json({ message: 'Your account is blocked by the admin.' });
        }

        if (user.role !== 'bidder') {
            return res.status(403).json({ message: 'Access denied. Only bidders are allowed to log in.' });
        }

        const token = jwt.sign({ id: user._id, role: user.role }, SECRET_KEY, { expiresIn: '1h' });

        res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                token,
            }
        });

    } catch (error) {
        console.error('Error verifying login:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const refreshToken = async (req: Request, res: Response) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const decoded = jwt.verify(token, SECRET_KEY) as TokenPayload;
        const newToken = jwt.sign({ id: decoded.id, role: decoded.role }, SECRET_KEY, { expiresIn: '1h' });

        res.status(200).json({ token: newToken });
    } catch (error) {
        console.error('Error refreshing token:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};


const createPaymentIntent = async (req: Request, res: Response) => {
    const { email, name } = req.body;
    console.log(req.body);

    try {
        const user = await userRepository.verifyUser(email);
        if (!user) {
            return res.status(404).json({ message: 'User not found. Please sign up to verify your email.' });
        }

        if (user.auctCode) {
            return res.status(400).json({ message: 'You have already paid and have an Auct Code.' });
        }

        const amount = 4999 * 100; // Amount in paise

        // Dummy address data
        const dummyAddress = {
            line1: '123 Main Street',
            city: 'Mumbai',
            state: 'Maharashtra',
            postal_code: '400001',
            country: 'IN',
        };

        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency: 'inr',
            payment_method_types: ['card'],
            receipt_email: email,
            description: 'Payment for Auct Code',
            shipping: {
                name: name,
                address: dummyAddress,
            },
        });

        const auctCode = generateAuctCode();
        await userRepository.updateUserAuctCode(user._id, auctCode);

        await sendPaymentConfirmationEmail(email, auctCode);

        res.status(200).send({
            clientSecret: paymentIntent.client_secret,
            auctCode,
        });
    } catch (error: any) {
        console.error('Error creating payment intent:', error);
        res.status(500).json({ message: error.message });
    }
};

const updateWallet = async (req: Request, res: Response) => {
    try {
        const adminUser = await userRepository.getAdminUser();
        if (!adminUser) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        await userRepository.updateAdminWallet(adminUser._id, 4999);
        res.status(200).json({ message: 'Admin wallet updated successfully' });
    } catch (error: any) {
        console.error('Error updating admin wallet:', error);
        res.status(500).json({ message: error.message });
    }
};


// export const getUserByEmail = async (req: Request, res: Response) => {
//     const { email } = req.query;

//     if (!email) {
//         return res.status(400).json({ message: 'Email is required' });
//     }

//     try {
//         const user = await UserModel.findOne({ email }).select('name email image walletBalance auctCode');
//         if (!user) {
//             return res.status(404).json({ message: 'User not found' });
//         }
//         res.json(user);
//     } catch (error) {
//         res.status(500).json({ message: 'Server error' });
//     }
// };


export const getUserByEmail = async (req: Request, res: Response) => {
    const { email } = req.query;

    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }

    try {
        const user = await UserModel.findOne({ email }).select('name email image walletBalance auctCode');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Fetch bidding history
        const items = await ItemModel.find({
            $or: [
                { 'biddingTokens.userId': user._id },
                { 'bidders.userId': user._id }
            ]
        }).select('title category make model name currentStatus bidStatus bidders biddingTokens transaction');

        const biddingHistory = items.map(item => {
            const userBid = item.bidders.find(bidder => bidder.userId.toString() === user._id.toString());
            const hasBiddingToken = item.biddingTokens.some(token => token.userId.toString() === user._id.toString());

            let itemTitle;
            if (item.category === 'Vehicles') {
                itemTitle = `${item.make} ${item.model}`;
            } else if (item.category === 'Wine and Spirits') {
                itemTitle = item.name;
            } else {
                itemTitle = item.title;
            }

            let bidResult, transactionStatus, bidAmount;

            // Determine transaction status
            if (userBid) {
                transactionStatus = item.transaction?.status || 'Pending';
            } else {
                transactionStatus = 'N/A';
            }

            // Determine bid result based on transaction status
            bidResult = transactionStatus === 'Completed' ? 'Success' : 'Pending';

            // Determine bid amount
            if (item.bidStatus === 'active' || !userBid) {
                bidAmount = 'N/A';
            } else {
                bidAmount = new Intl.NumberFormat('en-IN', { 
                    style: 'currency', 
                    currency: 'INR',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                }).format(userBid.bidAmount);
            }

            return {
                itemTitle,
                category: item.category,
                bidStatus: item.bidStatus,
                bidResult,
                transactionStatus,
                bidAmount,
                hasBiddingToken
            };
        });

        res.json({ 
            ...user.toObject(), 
            walletBalance: new Intl.NumberFormat('en-IN', { 
                style: 'currency', 
                currency: 'INR',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(user.walletBalance),
            biddingHistory 
        });
    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).json({ message: 'Server error' });
    }
};


export const updateUser = async (req: Request, res: Response) => {
    const { email, name, image } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }

    try {
        const user = await UserModel.findOneAndUpdate(
            { email },
            { name, image },
            { new: true }
        );
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};


export const uploadUserImage = async (req: Request, res: Response) => {
    const file = req.file;
    const { email } = req.body;

    if (!file || !email) {
        return res.status(400).json({ message: 'File and email are required' });
    }

    try {
        const fileName = await s3Uploader.uploadFile(file, file.originalname);
        const fileUrl = await s3Uploader.retrieveFile(fileName);

        const updatedUser = await UserModel.findOneAndUpdate(
            { email },
            { image: fileUrl },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ 
            fileUrl, 
            user: {
                name: updatedUser.name,
                email: updatedUser.email,
                auctCode: updatedUser.auctCode,
                walletBalance: updatedUser.walletBalance,
                image: updatedUser.image
            } 
        });
    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({ message: 'Error uploading file' });
    }
};






export {
    signup,
    verifyOtp,
    verifyLogin,
    resendOtp,
    refreshToken,
    createPaymentIntent,
    updateWallet,
};
