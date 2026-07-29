import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGO_URI || process.env.DB_URI;
        if (!mongoUri) {
            console.error("MONGO_URI or DB_URI is not defined in environment variables");
            process.exit(1);
        }
        
        const conn = await mongoose.connect(mongoUri);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`MongoDB connection error: ${error.message}`);
        process.exit(1);
    }
};

export default connectDB;
