import express from "express";
import dotenv from "dotenv";
import dbConnection from "./src/config/databaseConnection";
import router from "./src/routers/userRouter";
import adminRouter from "./src/routers/adminRouter";
import cors from 'cors';
import logger from 'morgan';
import cron from 'node-cron';
import axios from 'axios';
import ItemModel from "./src/models/itemModel";

dotenv.config();

const app = express();
app.use(cors());
app.use(logger('dev'));
app.use(express.json());

app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy", "default-src 'self'; font-src 'self' https://js.stripe.com;");
  next();
});

app.use('/', router);
app.use('/admin', adminRouter);

const PORT = process.env.PORT || 5000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// cron.schedule('* * * * *', async () => {
//   try {
//     const currentTime = new Date();
//     const itemsToClose = await ItemModel.find({
//       bidEndTime: { $lte: currentTime },
//       currentStatus: { $ne: 'closed' }
//     });

//     for (const item of itemsToClose) {
//       await axios.post(`${BASE_URL}/items/${item._id}/close-auction`);
//     }
//   } catch (error) {
//     console.error('Error in auction closing cron job:', error);
//   }
// });

dbConnection.connect()
  .then(() => {
    console.log('Database connected successfully');

    app.listen(PORT, () => {
      console.log(`Server is successfully running. Click here for more info: \x1b[34m${BASE_URL}`);
    });
  })
  .catch((error) => {
    console.error('Database connection failed', error);
  });