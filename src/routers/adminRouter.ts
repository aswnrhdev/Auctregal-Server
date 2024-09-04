import { Router } from "express";

import multer from 'multer';

import {
  adminLogin,
  refreshToken,
  blockBidder,
  getBidders,
  unblockBidder,
} from "../controllers/adminController";

import {
  addItem,
  getItemsByCategory,
  getItemsByStatus,
  addToBid,
  setToUpcomingAuction,
  closeBids,
  removeItem
} from "../controllers/itemController";

import adminAuth from "../middleware/adminAuth";

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

router.post('/login', adminLogin);
router.post('/refresh-token', refreshToken);

router.get('/bidders', adminAuth, getBidders);
router.put('/block-bidder/:id', adminAuth, blockBidder);
router.put('/unblock-bidder/:id', adminAuth, unblockBidder);

router.post('/add-item', upload.fields([
  { name: 'primaryImage', maxCount: 1 },
  { name: 'secondaryImage1', maxCount: 1 },
  { name: 'secondaryImage2', maxCount: 1 },
  { name: 'secondaryImage3', maxCount: 1 },
]), addItem);
router.get('/items/:category', getItemsByCategory);
router.get('/items/status/:status', getItemsByStatus);
router.put('/item/:itemId/set-upcoming', setToUpcomingAuction);
router.put('/item/:itemId/add-to-bid', addToBid);
router.delete('/item/:itemId', removeItem);
router.post('/close-bids', closeBids);

export default router;