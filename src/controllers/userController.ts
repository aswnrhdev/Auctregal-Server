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


// const updateUserName = async (req: Request, res: Response) => {
//     try {
//         const { id, name } = req.body;

//         if (!id || !name) {
//             return res.status(400).json({ message: 'ID and name are required' });
//         }

//         const user = await userRepository.updateUserName(id, name);

//         if (!user) {
//             return res.status(404).json({ message: 'User not found' });
//         }

//         return res.status(200).json({ message: 'User updated successfully' });
//     } catch (error) {
//         console.error('Error updating user name:', error);
//         return res.status(500).json({ message: 'Internal server error' });
//     }
// };


// const uploadProfileImage = async (req: Request, res: Response) => {
//     try {
//         const userId = req.body.userId; // User ID should be sent in the request body
//         const file = req.file;

//         if (!file) {
//             return res.status(400).json({ message: 'No file uploaded' });
//         }

//         // Verify user and update profile image URL
//         const updatedUser = await userRepository.updateUserProfileImage(userId, file.path);
//         if (!updatedUser) {
//             return res.status(404).json({ message: 'User not found' });
//         }

//         const imageUrl = `uploads/${path.basename(file.path)}`;
//         res.status(200).json({ message: 'Profile image uploaded successfully', imageUrl });
//     } catch (error) {
//         console.error('Error uploading profile image:', error);
//         res.status(500).json({ message: 'Internal server error' });
//     }
// };

// const getUserData = async (req: Request, res: Response) => {
//     try {
//         const userId = req.params.id;
//         const user = await userRepository.verifyUserById(userId);
//         if (!user) {
//             return res.status(404).json({ message: 'User not found' });
//         }
//         res.status(200).json({
//             id: user._id,
//             name: user.name,
//             email: user.email,
//             image: user.image
//         });
//     } catch (error) {
//         console.error('Error fetching user data:', error);
//         res.status(500).json({ message: 'Internal server error' });
//     }
// };

// const updateUserAddress = async (req: Request, res: Response) => {
//     try {
//         const { id, street, city, state, zipCode, country } = req.body;

//         if (!id) {
//             return res.status(400).json({ message: 'User ID is required' });
//         }

//         const user = await userRepository.updateUserAddress(id, { street, city, state, zipCode, country });

//         if (!user) {
//             return res.status(404).json({ message: 'User not found' });
//         }

//         return res.status(200).json({ message: 'Address updated successfully', user });
//     } catch (error) {
//         console.error('Error updating user address:', error);
//         return res.status(500).json({ message: 'Internal server error' });
//     }
// };

// const addUserAddress = async (req: Request, res: Response) => {
//     try {
//         const { id, street, city, state, zipCode, country } = req.body;

//         if (!id) {
//             return res.status(400).json({ message: 'User ID is required' });
//         }

//         const user = await userRepository.addUserAddress(id, { street, city, state, zipCode, country });

//         if (!user) {
//             return res.status(404).json({ message: 'User not found' });
//         }

//         return res.status(200).json({ message: 'Address added successfully', user });
//     } catch (error) {
//         console.error('Error adding user address:', error);
//         return res.status(500).json({ message: 'Internal server error' });
//     }
// };



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


// const generateBiddingTokenString = (): string => {
//     return crypto.randomBytes(4).toString('hex').toUpperCase();
// };

// export const generateBiddingToken = async (req: Request, res: Response): Promise<void> => {
//     try {
//         const { email, itemId } = req.body;

//         const user = await UserModel.findOne({ email });
//         if (!user) {
//             res.status(404).json({ message: 'User not found' });
//             return;
//         }

//         const item = await ItemModel.findById(itemId);
//         if (!item) {
//             res.status(404).json({ message: 'Item not found' });
//             return;
//         }

//         const existingToken = item.biddingTokens.find(token => token.userId.toString() === user._id.toString());
//         if (existingToken) {
//             res.status(400).json({ message: 'You already have a bidding token for this item' });
//             return;
//         }

//         const tokenAmount = item.basePrice * 0.1; // 10% of base price

//         const description = `Bidding token for item ${item.name} (${item._id})`;
//         const shipping = {
//             name: user.name,
//             address: {
//                 line1: '456 Another Street',
//                 city: 'Delhi',
//                 state: 'Delhi',
//                 postal_code: '110001',
//                 country: 'IN',
//             },
//         };

//         const paymentIntent = await stripe.paymentIntents.create({
//             amount: Math.round(tokenAmount * 100), // Stripe expects amount in cents
//             currency: 'inr',
//             payment_method_types: ['card'],
//             metadata: { userId: user._id.toString(), itemId: item._id.toString() },
//             description,
//             shipping,
//         });

//         res.status(200).json({
//             clientSecret: paymentIntent.client_secret,
//             amount: tokenAmount
//         });

//     } catch (error) {
//         console.error('Error generating bidding token:', error);
//         res.status(500).json({ message: 'Internal server error' });
//     }
// };

// export const confirmBiddingToken = async (req: Request, res: Response): Promise<void> => {
//     try {
//         const { paymentIntentId } = req.body;

//         const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
//         if (paymentIntent.status !== 'succeeded') {
//             res.status(400).json({ message: 'Payment not successful' });
//             return;
//         }

//         const { userId, itemId } = paymentIntent.metadata;

//         const user = await UserModel.findById(userId);
//         const item = await ItemModel.findById(itemId);

//         if (!user || !item) {
//             res.status(404).json({ message: 'User or Item not found' });
//             return;
//         }

//         const tokenAmount = item.basePrice * 0.1;
//         const admin = await UserModel.findOne({ role: 'admin' });

//         if (admin) {
//             admin.wallet += tokenAmount;
//             await admin.save();
//         }

//         const token = generateBiddingTokenString ();
//         const expiresAt = new Date(item.bidEndTime);

//         item.biddingTokens.push({
//             userId: user._id,
//             token,
//             expiresAt
//         });

//         await item.save();

//         res.status(200).json({ message: 'Bidding token generated successfully', token });

//     } catch (error) {
//         console.error('Error confirming bidding token:', error);
//         res.status(500).json({ message: 'Internal server error' });
//     }
// };

// export const validateBiddingToken = async (req: Request, res: Response) => {
//     try {
//         const { itemId, token, email } = req.body;
//         const item = await ItemModel.findById(itemId);
//         if (!item) {
//             return res.status(404).json({ isValid: false, message: 'Item not found' });
//         }

//         const tokenEntry = item.biddingTokens.find(t => t.token === token);
//         if (!tokenEntry) {
//             return res.status(400).json({ isValid: false, message: 'Invalid token' });
//         }

//         const user = await UserModel.findOne({ email });
//         if (!user || user._id.toString() !== tokenEntry.userId.toString()) {
//             return res.status(400).json({ isValid: false, message: 'Token does not belong to this user' });
//         }

//         if (new Date() > tokenEntry.expiresAt) {
//             return res.status(400).json({ isValid: false, message: 'Token has expired' });
//         }

//         res.json({ isValid: true });
//     } catch (error) {
//         console.error('Error validating bidding token:', error);
//         res.status(500).json({ isValid: false, message: 'Internal server error' });
//     }
// };


// export const placeBid = async (req: Request, res: Response) => {
//     try {
//         const { itemId, token, email, bidAmount } = req.body;
//         const item = await ItemModel.findById(itemId);
//         if (!item) {
//             return res.status(404).json({ success: false, message: 'Item not found' });
//         }

//         // Validate token
//         const tokenEntry = item.biddingTokens.find(t => t.token === token);
//         if (!tokenEntry) {
//             return res.status(400).json({ success: false, message: 'Invalid token' });
//         }

//         const user = await UserModel.findOne({ email });
//         if (!user || user._id.toString() !== tokenEntry.userId.toString()) {
//             return res.status(400).json({ success: false, message: 'Token does not belong to this user' });
//         }

//         if (new Date() > tokenEntry.expiresAt) {
//             return res.status(400).json({ success: false, message: 'Token has expired' });
//         }

//         if (bidAmount <= item.currentPrice) {
//             return res.status(400).json({ success: false, message: 'Bid amount must be higher than the current price' });
//         }

//         item.currentPrice = bidAmount;
//         await item.save();

//         res.json({ success: true, message: 'Bid placed successfully', newCurrentPrice: bidAmount });
//     } catch (error) {
//         console.error('Error placing bid:', error);
//         res.status(500).json({ success: false, message: 'Internal server error' });
//     }
// };


export const getUserByEmail = async (req: Request, res: Response) => {
    const { email } = req.query;

    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }

    try {
        const user = await UserModel.findOne({ email }).select('name email image walletBalance auctCode'); // Add necessary fields
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
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

    if (!file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    try {
        // Provide the original file name to the uploadFile method
        const fileUrl = await s3Uploader.uploadFile(file, file.originalname);
        res.json({ fileUrl });
    } catch (error) {
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
