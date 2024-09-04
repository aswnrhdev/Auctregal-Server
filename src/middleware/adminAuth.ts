import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const SECRET_KEY = process.env.SECRET_KEY || '';

interface TokenPayload {
    id: string;
    role: string;
}

declare module 'express-serve-static-core' {
    interface Request {
        user?: TokenPayload;
    }
}

const adminAuth = (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1];
    console.log(token, 'token');
    

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, SECRET_KEY) as TokenPayload;

        if (decoded.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }

        req.user = { id: decoded.id, role: decoded.role };
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

export default adminAuth;
