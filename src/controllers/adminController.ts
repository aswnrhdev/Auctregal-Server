import { Request, Response } from "express";
import jwt, { JwtPayload } from 'jsonwebtoken';
import UserRepository from "../repository/implementation/UserRepository";
import { IUserRepository } from "../repository/interface/IUserRepository";

const userRepository: IUserRepository = new UserRepository();
const SECRET_KEY = process.env.SECRET_KEY || '';
const REFRESH_SECRET_KEY = process.env.SECRET_KEY || '';

export const adminLogin = async (req: Request, res: Response) => {
    const { email, password } = req.body;
    console.log(req.body);

    try {
        const user = await userRepository.verifyUser(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid email' });
        }

        const isAdmin = await userRepository.isAdmin(user);
        if (!isAdmin) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const isPasswordValid = await userRepository.checkPassword(user, password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Incorrect password. Please try again.' });
        }

        const token = jwt.sign({ id: user._id.toString(), role: user.role }, SECRET_KEY, { expiresIn: '1h' });
        const refreshToken = jwt.sign({ id: user._id.toString(), role: user.role }, REFRESH_SECRET_KEY, { expiresIn: '7d' });

        await userRepository.saveRefreshToken(user._id.toString(), refreshToken);

        res.status(200).json({
            message: 'Login successful',
            admin: {
                id: user._id.toString(),
                email: user.email,
                role: user.role,
                token,
                refreshToken,
            },
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const refreshToken = async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(401).json({ error: 'No refresh token provided' });
    }

    try {
        const decoded = jwt.verify(refreshToken, REFRESH_SECRET_KEY) as JwtPayload;
        const user = await userRepository.verifyUserById(decoded.id);

        if (!user || user.refreshToken !== refreshToken) {
            return res.status(403).json({ error: 'Invalid refresh token' });
        }

        const newAccessToken = jwt.sign({ id: user._id.toString(), role: user.role }, SECRET_KEY, { expiresIn: '1h' });

        res.status(200).json({
            token: newAccessToken,
        });
    } catch (error) {
        return res.status(401).json({ error: 'Invalid refresh token' });
    }
};

export const getBidders = async (req: Request, res: Response) => {
    try {
        const bidders = await userRepository.getUsersByRole('bidder');
        res.status(200).json(bidders);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const blockBidder = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await userRepository.updateUserStatus(id, true);
        res.status(200).json({ message: 'Bidder blocked successfully' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const unblockBidder = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await userRepository.updateUserStatus(id, false);
        res.status(200).json({ message: 'Bidder unblocked successfully' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};






