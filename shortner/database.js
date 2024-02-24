const mongoose = require('mongoose');
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
module.exports = {
    connect: async () => {
        try {
            await mongoose.connect(process.env.MONGODB_URI, 
            {
                dbName: 'url-shortener',
                useNewUrlParser: true,
                useUnifiedTopology: true,
                useCreateIndex: true,
            });
            console.log('Mongoose connected');
        } catch (error) {
            console.log('Error connecting to MongoDB:', error);
        }
    },
};
