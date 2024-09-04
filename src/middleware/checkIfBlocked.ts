import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import UserModel from '../models/usersModel';

const SECRET_KEY = process.env.SECRET_KEY as string;

const checkIfBlocked = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.cookies.token;

        if (!token) {
            return res.status(401).send({ message: 'No token provided, please log in.' });
        }

        const decoded: any = jwt.verify(token, SECRET_KEY);
        const userId = decoded.id;

        const user = await UserModel.findById(userId);
        
        if (!user) {
            return res.status(401).send({ message: 'User not found.' });
        }

        if (user.isBlocked) {
            return res.status(403).send({ message: 'You are blocked by the admin.' });
        }

        next();
    } catch (error) {
        console.error('Error in checkIfBlocked middleware:', error);
        res.status(500).send({ message: 'Internal server error' });
    }
};

export default checkIfBlocked;
