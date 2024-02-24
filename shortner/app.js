const express = require('express');
const path = require('path');
const createHttpError = require('http-errors');
const routes = require('./routes');
const database = require('./database');
const redis = require('redis');
const QRCode = require('qrcode');

require('dotenv').config();
const app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Redis connection setup
const redisClient = redis.createClient();

(async () => {
  await redisClient.connect();
})();

redisClient.on("ready", () => {
  console.log("Connected!");
});

redisClient.on("error", (err) => {
  console.log("Error in the Connection");
});

// Connect to MongoDB
database.connect();

app.set('view engine', 'ejs');
routes(app, redisClient, QRCode);

app.use((req, res, next) => {
  next(createHttpError.NotFound());
});

app.use((err, req, res, next) => {
  res.status(err.status || 500)
    .render('index', { error: err.message });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
