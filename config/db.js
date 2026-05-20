const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const { MONGO_USERNAME, MONGO_PASSWORD, DB_NAME } = process.env;

const connectDB = async () => {
    try {

        await mongoose.connect(`mongodb+srv://${MONGO_USERNAME}:${MONGO_PASSWORD}@cluster0.zdthrl3.mongodb.net/?appName=Cluster0`, { dbName: DB_NAME });
        console.log("MongoDB connected");
    } catch (error) {
        console.error("MongoDB connection error:", error);
        process.exit(1);
    }
};

module.exports = { connectDB };




