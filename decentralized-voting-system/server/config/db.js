const mongoose = require('mongoose');
const config = require('config');

const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI || config.get('mongoURI');
        if (!uri) {
            console.error('MongoDB URI is not defined. Please set MONGODB_URI environment variable.');
            process.exit(1);
        }
        
        console.log('Connecting to MongoDB...');
        await mongoose.connect(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 10000, // Increased timeout
            socketTimeoutMS: 60000, // Increased socket timeout
            family: 4,
            retryWrites: true,
            w: 'majority'
        });
        
        console.log('✅ MongoDB Connected Successfully');
        return mongoose.connection;
    } catch (err) {
        console.error('❌ MongoDB Connection Error:', {
            message: err.message,
            stack: err.stack,
            name: err.name
        });
        // Give some time for logs to flush before exiting
        setTimeout(() => process.exit(1), 1000);
    }
};

module.exports = connectDB;
