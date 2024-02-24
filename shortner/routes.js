const express = require('express');
const shortId = require('shortid');
const createHttpError = require('http-errors');
const ShortUrl = require('../models/url.model');

module.exports = (app, redisClient, QRCode) => {
    const router = express.Router();

    // GET / endpoint (index)
    router.get('/', async (req, res, next) => {
        res.render('index');
    });

    // POST / endpoint
    router.post('/', async (req, res, next) => {
        try {
            const { url } = req.body;

            if (!url) {
                throw createHttpError.BadRequest('Provide a valid URL');
            }

            const cachedUrl = await redisClient.get(url);

            if (cachedUrl) {
                const cachedShortUrl = await ShortUrl.findOne({ shortId: cachedUrl });

                if (cachedShortUrl && cachedShortUrl.qrCode) {
                    return res.render('index', {
                        short_url: `${req.headers.host}/${cachedShortUrl.shortId}`,
                        qr_code: `data:image/png;base64,${cachedShortUrl.qrCode}`,
                    });
                }
            }

            const urlExists = await ShortUrl.findOne({ url });

            if (urlExists) {
                await redisClient.set(url, urlExists.shortId);

                if (urlExists.qrCode) {
                    return res.render('index', {
                        short_url: `${req.headers.host}/${urlExists.shortId}`,
                        qr_code: `data:image/png;base64,${urlExists.qrCode}`,
                    });
                }
            }

            const shortIdValue = shortId.generate();
            const qrCodeBuffer = await QRCode.toBuffer(url);
            const qrCodeBase64 = qrCodeBuffer.toString('base64');
            // console.log('QR Code Base64:', qrCodeBase64);
            const shortUrl = new ShortUrl({ url, shortId: shortIdValue, qrCode: qrCodeBase64 });
            try {
                const result = await shortUrl.save();
                console.log('Data saved successfully:', result);
            } catch (error) {
                console.error('Error saving data to MongoDB:', error);
            }
            await redisClient.set(url, shortIdValue);
            // console.log('QR Code Base64:', result.qrCode);
            return res.render('index', {
                short_url: `${req.headers.host}/${result.shortId}`,
                qr_code: `data:image/png;base64,${result.qrCode}`,
            });

        } catch (error) {
            next(error);
        }
    });

    router.get('/:shortId', async (req, res, next) => {
        try {
            const { shortId } = req.params;
            // Check Redis cache first
            const cachedUrl = await redisClient.get(shortId);
            if (cachedUrl) {
                res.redirect(cachedUrl);
                return;
            }

            const result = await ShortUrl.findOne({ shortId });
            if (!result) {
                throw createHttpError.NotFound('Short url does not exist');
            }

            redisClient.set(shortId, result.url);
            res.redirect(result.url);
        } catch (error) {
            next(error);
        }
    });

    app.use('/', router);
};
