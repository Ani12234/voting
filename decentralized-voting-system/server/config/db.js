const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) {
            console.error('❌ MONGODB_URI is not defined in environment variables');
            console.error('Please set the MONGODB_URI environment variable in your Vercel project settings');
            process.exit(1);
        }
        
        console.log('🔌 Connecting to MongoDB...');
        
        const options = {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 60000,
            family: 4,
            retryWrites: true,
            w: 'majority',
            maxPoolSize: 10,  // Maximum number of connections in the connection pool
            minPoolSize: 1,   // Minimum number of connections in the connection pool
            maxIdleTimeMS: 30000, // How long a connection can be idle before being removed
            connectTimeoutMS: 10000 // How long to wait for connection to establish
        };
        
        await mongoose.connect(uri, options);
        
        console.log('✅ MongoDB Connected Successfully');
        return mongoose.connection;
    } catch (err) {
        console.error('❌ MongoDB Connection Error:', {
            message: err.message,
            name: err.name,
            code: err.code,
            codeName: err.codeName
        });
        
        // Give some time for logs to flush before exiting
        setTimeout(() => process.exit(1), 1000);
    }
};

// Handle Node.js process termination
process.on('SIGINT', async () => {
    try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed due to app termination');
        process.exit(0);
    } catch (err) {
        console.error('Error closing MongoDB connection:', err);
        process.exit(1);
    }
});

module.exports = connectDB;
