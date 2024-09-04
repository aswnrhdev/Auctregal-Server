import { RequestHandler } from "express";
import { IItemRepository } from "../repository/interface/IItemRepository";
import S3Uploader from "../services/s3Bucket";
import ItemModel from "../models/itemModel";
import ItemRepository from "../repository/implementation/IItemRepository";

const categoryFields: Record<string, string[]> = {
  'Art and Antiques': ['Title', 'Artist', 'Year', 'Medium', 'Dimensions', 'Condition', 'Provenance', 'Base Price', 'Current Price'],
  'Jewelry and Watches': ['Title', 'Brand', 'Material', 'Gemstone', 'Carat Weight', 'Condition', 'Certification', 'Base Price', 'Current Price'],
  'Collectables': ['Title', 'Type', 'Era', 'Condition', 'Rarity', 'Manufacturer', 'Base Price', 'Current Price'],
  'Vehicles': ['Make', 'Model', 'Year', 'Mileage', 'Condition', 'VIN', 'Color', 'Base Price', 'Current Price'],
  'Wine and Spirits': ['Name', 'Type', 'Vintage', 'Region', 'ABV', 'Bottle Size', 'Condition', 'Base Price', 'Current Price'],
  'Rare Books and Manuscripts': ['Title', 'Author', 'Year', 'Edition', 'Condition', 'Publisher', 'Language', 'Base Price', 'Current Price']
};

const s3Uploader = new S3Uploader();

export class ItemController {
  constructor(private itemRepository: IItemRepository) { }

  addItem: RequestHandler = async (req, res) => {
    try {
      const { category, description } = req.body;

      const fields = categoryFields[category] || [];
      const itemData: any = { category, description };

      fields.forEach(field => {
        const camelCaseField = field.charAt(0).toLowerCase() + field.slice(1).replace(/\s+/g, '');
        itemData[camelCaseField] = req.body[field] || req.body[camelCaseField];
      });

      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

      if (files && files['primaryImage']) {
        const primaryImageName = await s3Uploader.uploadFile(files['primaryImage'][0], files['primaryImage'][0].originalname);
        itemData.primaryImage = primaryImageName;
      }

      if (files) {
        const secondaryImages = [];
        for (let i = 1; i <= 3; i++) {
          if (files[`secondaryImage${i}`]) {
            const imageName = await s3Uploader.uploadFile(files[`secondaryImage${i}`][0], files[`secondaryImage${i}`][0].originalname);
            secondaryImages.push(imageName);
          }
        }
        itemData.secondaryImages = secondaryImages;
      }

      const savedItem = await this.itemRepository.addItem(itemData);
      res.status(201).json(savedItem);
    } catch (error) {
      console.error('Error adding item:', error);
      res.status(500).json({ message: 'Error adding item', error: error instanceof Error ? error.message : String(error) });
    }
  };

  getItemsByCategory: RequestHandler = async (req, res) => {
    try {
      const { category } = req.params;
      const items = await this.itemRepository.findItemsByCategory(category);
      const itemsWithSignedUrls = await Promise.all(items.map(async (item) => {
        const itemObj = item.toObject();
        if (itemObj.primaryImage) {
          itemObj.primaryImage = await s3Uploader.retrieveFile(itemObj.primaryImage);
        }
        if (itemObj.secondaryImages) {
          itemObj.secondaryImages = await Promise.all(itemObj.secondaryImages.map((img: string) => s3Uploader.retrieveFile(img)));
        }
        return itemObj;
      }));
      res.status(200).json(itemsWithSignedUrls);
    } catch (error) {
      console.error('Error fetching items by category:', error);
      res.status(500).json({ message: 'Error fetching items', error: error instanceof Error ? error.message : String(error) });
    }
  };

  setToUpcomingAuction: RequestHandler = async (req, res) => {
    try {
      const { itemId } = req.params;
      const updatedItem = await this.itemRepository.updateItemStatus(itemId, 'upcoming');
      res.status(200).json(updatedItem);
    } catch (error) {
      console.error('Error setting item to upcoming auction:', error);
      res.status(500).json({ message: 'Error setting item to upcoming auction', error: error instanceof Error ? error.message : String(error) });
    }
  };

  addToBid: RequestHandler = async (req, res) => {
    try {
      const { itemId } = req.params;
      const { duration } = req.body;
      const bidStartTime = new Date();
      const bidEndTime = new Date(bidStartTime.getTime() + duration * 24 * 60 * 60 * 1000);

      const updatedItem = await this.itemRepository.updateItemToBidding(itemId, bidStartTime, bidEndTime);
      res.status(200).json(updatedItem);
    } catch (error) {
      console.error('Error adding item to bid:', error);
      res.status(500).json({ message: 'Error adding item to bid', error: error instanceof Error ? error.message : String(error) });
    }
  };

  getItemsByStatus: RequestHandler = async (req, res) => {
    try {
      const { status } = req.params;
      const items = await this.itemRepository.findItemsByStatus(status);
      const itemsWithSignedUrls = await Promise.all(items.map(async (item) => {
        const itemObj = item.toObject();
        if (itemObj.primaryImage) {
          itemObj.primaryImage = await s3Uploader.retrieveFile(itemObj.primaryImage);
        }
        if (itemObj.secondaryImages) {
          itemObj.secondaryImages = await Promise.all(itemObj.secondaryImages.map((img: string) => s3Uploader.retrieveFile(img)));
        }
        return itemObj;
      }));
      res.status(200).json(itemsWithSignedUrls);
    } catch (error) {
      console.error('Error fetching items by status:', error);
      res.status(500).json({ message: 'Error fetching items', error: error instanceof Error ? error.message : String(error) });
    }
  };

  closeBids: RequestHandler = async (req, res) => {
    try {
      const currentTime = new Date();
      const closedBids = await this.itemRepository.closeBids(currentTime);
      res.status(200).json({ message: 'Bids closed successfully', closedBids });
    } catch (error) {
      console.error('Error closing bids:', error);
      res.status(500).json({ message: 'Error closing bids', error: error instanceof Error ? error.message : String(error) });
    }
  };

  removeItem: RequestHandler = async (req, res) => {
    try {
      const { itemId } = req.params;
      const removedItem = await this.itemRepository.removeItem(itemId);
      if (removedItem) {
        res.status(200).json({ message: 'Item removed successfully', removedItem });
      } else {
        res.status(404).json({ message: 'Item not found' });
      }
    } catch (error) {
      console.error('Error removing item:', error);
      res.status(500).json({ message: 'Error removing item', error: error instanceof Error ? error.message : String(error) });
    }
  };

  getUpcomingItems: RequestHandler = async (req, res) => {
    try {
      const items = await this.itemRepository.findUpcomingItems();
      const itemsWithSignedUrls = await Promise.all(items.map(async (item) => {
        const itemObj = item.toObject();
        if (itemObj.primaryImage) {
          itemObj.primaryImage = await s3Uploader.retrieveFile(itemObj.primaryImage);
        }
        if (itemObj.secondaryImages) {
          itemObj.secondaryImages = await Promise.all(itemObj.secondaryImages.map((img: string) => s3Uploader.retrieveFile(img)));
        }
        return itemObj;
      }));
      res.status(200).json(itemsWithSignedUrls);
    } catch (error) {
      console.error('Error fetching upcoming items:', error);
      res.status(500).json({ message: 'Error fetching upcoming items', error: error instanceof Error ? error.message : String(error) });
    }
  };

  getClosedItems: RequestHandler = async (req, res) => {
    try {
      const items = await this.itemRepository.findClosedItems();
      const itemsWithSignedUrls = await Promise.all(items.map(async (item) => {
        const itemObj = item.toObject();
        if (itemObj.primaryImage) {
          itemObj.primaryImage = await s3Uploader.retrieveFile(itemObj.primaryImage);
        }
        if (itemObj.secondaryImages) {
          itemObj.secondaryImages = await Promise.all(itemObj.secondaryImages.map((img: string) => s3Uploader.retrieveFile(img)));
        }
        return itemObj;
      }));
      res.status(200).json(itemsWithSignedUrls);
    } catch (error) {
      console.error('Error fetching closed items:', error);
      res.status(500).json({ message: 'Error fetching closed items', error: error instanceof Error ? error.message : String(error) });
    }
  };

  increaseInterestCount: RequestHandler = async (req, res) => {
    try {
      const { itemId } = req.params;
      const updatedItem = await this.itemRepository.increaseInterestCount(itemId);
      if (!updatedItem) {
        return res.status(404).json({ message: 'Item not found' });
      }
      res.status(200).json(updatedItem);
    } catch (error) {
      console.error('Error increasing interest count:', error);
      res.status(500).json({ message: 'Error increasing interest count', error: error instanceof Error ? error.message : String(error) });
    }
  };

  getBiddingItems: RequestHandler = async (req, res) => {
    try {
      const items = await this.itemRepository.findBiddingItems();
      const itemsWithSignedUrls = await Promise.all(items.map(async (item) => {
        const itemObj = item.toObject();
        if (itemObj.primaryImage) {
          itemObj.primaryImage = await s3Uploader.retrieveFile(itemObj.primaryImage);
        }
        if (itemObj.secondaryImages) {
          itemObj.secondaryImages = await Promise.all(itemObj.secondaryImages.map((img: string) => s3Uploader.retrieveFile(img)));
        }
        return itemObj;
      }));
      res.status(200).json(itemsWithSignedUrls);
    } catch (error) {
      console.error('Error fetching bidding items:', error);
      res.status(500).json({ message: 'Error fetching bidding items', error: error instanceof Error ? error.message : String(error) });
    }
  };

  getItemById: RequestHandler = async (req, res) => {
    try {
      const { itemId } = req.params;
      const item = await this.itemRepository.findItemById(itemId);
      if (!item) {
        return res.status(404).json({ message: 'Item not found' });
      }
      const itemObj = item.toObject();
      if (itemObj.primaryImage) {
        itemObj.primaryImage = await s3Uploader.retrieveFile(itemObj.primaryImage);
      }
      if (itemObj.secondaryImages) {
        itemObj.secondaryImages = await Promise.all(itemObj.secondaryImages.map((img: string) => s3Uploader.retrieveFile(img)));
      }
      res.status(200).json(itemObj);
    } catch (error) {
      console.error('Error fetching item by ID:', error);
      res.status(500).json({ message: 'Error fetching item', error: error instanceof Error ? error.message : String(error) });
    }
  };
}



const itemRepository = new ItemRepository(ItemModel);
const itemController = new ItemController(itemRepository);

export const addItem = itemController.addItem;
export const getItemsByCategory = itemController.getItemsByCategory;
export const setToUpcomingAuction = itemController.setToUpcomingAuction;
export const addToBid = itemController.addToBid;
export const getItemsByStatus = itemController.getItemsByStatus;
export const closeBids = itemController.closeBids;
export const removeItem = itemController.removeItem;
export const getUpcomingItems = itemController.getUpcomingItems;
export const getClosedItems = itemController.getClosedItems;
export const increaseInterestCount = itemController.increaseInterestCount;
export const getBiddingItems = itemController.getBiddingItems;
export const getItemById = itemController.getItemById;