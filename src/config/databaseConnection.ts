import mongoose from "mongoose";

class DatabaseConnection {
    connect() {
        return mongoose.connect(process.env.MONGODB_URL as string);
    }
}

const dbConnection = new DatabaseConnection();
export default dbConnection;
