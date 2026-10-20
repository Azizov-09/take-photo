require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Configure multer for memory storage (we could save to disk, but memory is faster for just forwarding)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Telegram Configuration — .env faylidan o'qiladi
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID   = process.env.CHAT_ID;

if (!BOT_TOKEN || !CHAT_ID) {
    console.error('❌ .env faylida BOT_TOKEN yoki CHAT_ID topilmadi!');
    process.exit(1);
}

// Validate Bot Token on Start
axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`)
    .then(res => {
        console.log(`Bot connected successfully: @${res.data.result.username}`);
    })
    .catch(err => {
        console.error('Error connecting to Telegram Bot API:', err.message);
    });

app.post('/upload', upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Clean and log the Chat ID
        let targetChatId = req.body.chat_id || CHAT_ID;
        targetChatId = targetChatId.trim();

        console.log(`Received request to send photo to Chat ID: '${targetChatId}'`);

        if (targetChatId === 'YOUR_CHAT_ID' || !targetChatId) {
            console.error('Chat ID is missing or invalid.');
            return res.status(500).json({ error: 'Chat ID is missing. Please enter your numeric Telegram Chat ID.' });
        }

        console.log('Received photo, sending to Telegram...');

        // Prepare form data for Telegram
        const form = new FormData();
        form.append('chat_id', targetChatId);
        form.append('photo', req.file.buffer, {
            filename: 'photo.png',
            contentType: req.file.mimetype,
        });

        // Send to Telegram
        const telegramResponse = await axios.post(
            `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`,
            form,
            {
                headers: {
                    ...form.getHeaders(),
                },
            }
        );

        console.log('Photo sent successfully:', telegramResponse.data.ok);
        res.json({ success: true, telegram_data: telegramResponse.data });

    } catch (error) {
        console.error('Error sending to Telegram:', error.response ? error.response.data : error.message);

        // Return clearer error to frontend
        const telegramError = error.response && error.response.data
            ? error.response.data.description
            : error.message;

        res.status(500).json({
            error: `Telegram Error: ${telegramError}`,
            details: error.response ? error.response.data : error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
