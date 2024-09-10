import { Router } from "express";

import {
    resendOtp,
    signup,
    verifyLogin,
    verifyOtp,
    refreshToken,
    createPaymentIntent,
    updateWallet,
    getUserByEmail,
    updateUser,
    uploadUserImage,
} from "../controllers/userController";

import {
    getBiddingItems,
    getClosedItems,
    getItemById,
    getUpcomingItems,
    increaseInterestCount
} from "../controllers/itemController";

import {
    handleChatbotMessage
} from "../controllers/chatbotController";

import {
    completeAuctionPayment,
    confirmAuctionPayment,
    confirmBiddingToken,
    generateBiddingToken,
    placeBid,
    validateBiddingToken
} from "../controllers/biddingController";

import {
    generateSlip,
    getAllSlips,
    getCheckoutData,
    getItem,
    getSlipByItemId,
    getSlipDetails,
    getUser,
    processRefund
} from "../controllers/slipController";

import {
    createContact,
    getAllContacts
} from "../controllers/contactController";
import { getDashboardStats } from "../controllers/dashboardController";
import multer from "multer";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/signup', signup);
router.post('/verifyOtp', verifyOtp);
router.post('/login', verifyLogin);
router.post('/resendOtp', resendOtp);
router.post('/refreshToken', refreshToken);

router.get('/user', getUserByEmail);
router.put('/user', updateUser);
router.post('/upload', upload.single('file'), uploadUserImage);

router.post('/create-payment-intent', createPaymentIntent);
router.post('/update-wallet', updateWallet);

router.get('/items/upcoming', getUpcomingItems);
router.get('/items/closed', getClosedItems);
router.post('/items/:itemId/interest', increaseInterestCount);
router.get('/items/bidding', getBiddingItems);
router.get('/items/:itemId', getItemById);

router.post('/generate-bidding-token', generateBiddingToken);
router.post('/confirm-bidding-token', confirmBiddingToken);
router.post('/validate-bidding-token', validateBiddingToken);
router.post('/place-bid', placeBid);

router.post('/chatbot', handleChatbotMessage);

router.post('/complete-auction-payment', completeAuctionPayment);
router.post('/confirm-auction-payment', confirmAuctionPayment);

router.get('/checkout-data', getCheckoutData);
router.post('/generate-slip', generateSlip);
router.get('/getSlip/:itemId', getSlipByItemId);
router.get('/users/:userId', getUser);
router.get('/items/:itemId', getItem);
router.get('/slips', getAllSlips);
router.get('/slips/:slipId', getSlipDetails);
router.post('/slips/:slipCode/refund', processRefund);

router.post('/contacts', createContact);
router.get('/contacts', getAllContacts);

router.get('/admin/dashboard-stats', getDashboardStats);

export default router;
