require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const axios = require('axios');
const FormData = require('form-data');

// Vars — .env faylidan o'qiladi
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID   = process.env.CHAT_ID;

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
            // Try to be helpful if body parser failed
            res.end(JSON.stringify({ error: 'No image data received. Ensure Content-Type is application/json' }));
            return;
        }

        // image is "data:image/jpeg;base64,......."
        // Strip metadata
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

// NOTE: We REMOVED the config { bodyParser: false }
// so Vercel AUTOMATICALLY parses the JSON body.
