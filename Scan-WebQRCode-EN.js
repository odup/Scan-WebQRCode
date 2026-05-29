// ==UserScript==
// @name         Scan Web QR Code
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Right-click on a QR code first, then run this script from the Tampermonkey menu to recognize it. Supports copying text and opening links.
// @author       Odup
// @match        *://*/*
// @require      https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js
// @grant        GM_setClipboard
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // Inject simple popup styles
    GM_addStyle(`
        #qr-scanner-result-panel {
            position: fixed; top: 20px; right: 20px; width: 300px;
            background: #fff; border: 1px solid #ccc; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            padding: 15px; z-index: 999999; border-radius: 8px; font-family: sans-serif;
        }
        #qr-scanner-result-panel h3 { margin-top: 0; font-size: 16px; color: #333; }
        #qr-scanner-result-panel p { word-break: break-all; font-size: 14px; color: #666; margin: 10px 0; background: #f5f5f5; padding: 8px; border-radius: 4px;}
        .qr-btn { padding: 6px 12px; margin-right: 10px; cursor: pointer; border: none; border-radius: 4px; color: #fff; font-size: 13px;}
        .qr-btn-copy { background: #4CAF50; }
        .qr-btn-copy:hover { background: #45a049; }
        .qr-btn-open { background: #2196F3; }
        .qr-btn-open:hover { background: #1e88e5; }
        .qr-btn-close { background: #f44336; float: right; padding: 4px 8px;}
    `);

    // Used to track the last image element that was right-clicked
    let lastRightClickedImage = null;

    // Global mouse event listener: captures right-clicked images
    document.addEventListener('mousedown', function(event) {
        // event.button === 2 represents right-click
        if (event.button === 2 && event.target.tagName.toLowerCase() === 'img') {
            lastRightClickedImage = event.target;
            console.log('Target QR code image locked, waiting for recognition:', lastRightClickedImage);
        }
    }, true); // Use capture phase to ensure the element is grabbed immediately

    // Core function to parse the image element
    function scanImage(imgElement) {
        return new Promise((resolve) => {
            let canvas = document.createElement('canvas');
            let context = canvas.getContext('2d');

            let img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = function() {
                canvas.width = img.width;
                canvas.height = img.height;
                context.drawImage(img, 0, 0, img.width, img.height);
                try {
                    let imageData = context.getImageData(0, 0, img.width, img.height);
                    let code = jsQR(imageData.data, imageData.width, imageData.height);
                    if (code) resolve(code.data);
                    else resolve(null);
                } catch (e) {
                    resolve(null);
                }
            };
            img.onerror = () => resolve(null);
            img.src = imgElement.src;
        });
    }

    // Display the result popup panel
    function showResult(text) {
        let existingPanel = document.getElementById('qr-scanner-result-panel');
        if (existingPanel) existingPanel.remove();

        let panel = document.createElement('div');
        panel.id = 'qr-scanner-result-panel';

        let title = document.createElement('h3');
        title.innerText = '✅ QR Code Recognized Successfully';

        let content = document.createElement('p');
        content.innerText = text;

        let copyBtn = document.createElement('button');
        copyBtn.className = 'qr-btn qr-btn-copy';
        copyBtn.innerText = 'Copy Content';
        copyBtn.onclick = () => {
            GM_setClipboard(text);
            copyBtn.innerText = 'Copied!';
            setTimeout(() => copyBtn.innerText = 'Copy Content', 2000);
        };

        let openBtn = document.createElement('button');
        openBtn.className = 'qr-btn qr-btn-open';
        openBtn.innerText = 'Open URL';
        openBtn.onclick = () => window.open(text, '_blank');

        let closeBtn = document.createElement('button');
        closeBtn.className = 'qr-btn qr-btn-close';
        closeBtn.innerText = '✖';
        closeBtn.onclick = () => panel.remove();

        panel.appendChild(closeBtn);
        panel.appendChild(title);
        panel.appendChild(content);
        panel.appendChild(copyBtn);

        // Simple check to see if the text is a URL; if so, show the "Open URL" button
        if (/^https?:\/\//i.test(text)) {
            panel.appendChild(openBtn);
        }

        document.body.appendChild(panel);
    }

    // Main function to execute the scan on the locked right-clicked image
    async function executeScan() {
        if (!lastRightClickedImage) {
            alert('❌ Please [Right-Click] on the QR code image you want to recognize first, then run this function!');
            return;
        }

        let result = await scanImage(lastRightClickedImage);

        if (result) {
            showResult(result);
        } else {
            alert('⚠️ Recognition failed!\n\nPossible reasons:\n1. The image is not a clear QR code.\n2. The image is hosted on a third-party server and is blocked by browser Cross-Origin Resource Sharing (CORS) security restrictions.');
        }

        // Reset the target after scanning to prevent accidental misoperation next time
        lastRightClickedImage = null;
    }

    // Register the activation command in the Tampermonkey menu
    GM_registerMenuCommand("Scan Current QR Code", executeScan);

})();
