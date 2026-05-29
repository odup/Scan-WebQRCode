// ==UserScript==
// @name         扫一扫-网页二维码
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  先在二维码上右键点击，再通过油猴菜单识别该二维码，支持复制和打开链接。
// @author       Odup
// @match        *://*/*
// @require      https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js
// @grant        GM_setClipboard
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // 注入简单的弹窗样式
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

    // 用于记录最后一次被右键点击的图片元素
    let lastRightClickedImage = null;

    // 全局监听鼠标事件：捕获右键点击的图片
    document.addEventListener('mousedown', function(event) {
        // event.button === 2 代表鼠标右键
        if (event.button === 2 && event.target.tagName.toLowerCase() === 'img') {
            lastRightClickedImage = event.target;
            console.log('已锁定目标二维码图片等待识别:', lastRightClickedImage);
        }
    }, true); // 使用捕获阶段，确保能第一时间拿到元素

    // 解析图片元素的核心函数
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

    // 显示结果弹窗
    function showResult(text) {
        let existingPanel = document.getElementById('qr-scanner-result-panel');
        if (existingPanel) existingPanel.remove();

        let panel = document.createElement('div');
        panel.id = 'qr-scanner-result-panel';

        let title = document.createElement('h3');
        title.innerText = '✅ 二维码识别成功';

        let content = document.createElement('p');
        content.innerText = text;

        let copyBtn = document.createElement('button');
        copyBtn.className = 'qr-btn qr-btn-copy';
        copyBtn.innerText = '复制内容';
        copyBtn.onclick = () => {
            GM_setClipboard(text);
            copyBtn.innerText = '已复制!';
            setTimeout(() => copyBtn.innerText = '复制内容', 2000);
        };

        let openBtn = document.createElement('button');
        openBtn.className = 'qr-btn qr-btn-open';
        openBtn.innerText = '打开网址';
        openBtn.onclick = () => window.open(text, '_blank');

        let closeBtn = document.createElement('button');
        closeBtn.className = 'qr-btn qr-btn-close';
        closeBtn.innerText = '✖';
        closeBtn.onclick = () => panel.remove();

        panel.appendChild(closeBtn);
        panel.appendChild(title);
        panel.appendChild(content);
        panel.appendChild(copyBtn);

        // 简单判断是否为网址，是的话才显示“打开”按钮
        if (/^https?:\/\//i.test(text)) {
            panel.appendChild(openBtn);
        }

        document.body.appendChild(panel);
    }

    // 执行扫描右键锁定图片的主函数
    async function executeScan() {
        if (!lastRightClickedImage) {
            alert('❌ 请先在你想识别的二维码图片上【点击鼠标右键】，然后再运行此功能！');
            return;
        }

        let result = await scanImage(lastRightClickedImage);

        if (result) {
            showResult(result);
        } else {
            alert('⚠️ 识别失败！\n\n可能原因：\n1. 这张图片不是清晰的二维码。\n2. 图片存放在第三方服务器上，受到了浏览器的跨域(CORS)安全限制。');
        }

        // 识别完成后重置目标，防止下次误操作
        lastRightClickedImage = null;
    }

    // 在油猴菜单中注册启动按钮
    GM_registerMenuCommand("识别当前二维码", executeScan);

})();