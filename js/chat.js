let ws;
let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    const joinBtn = document.getElementById('join-btn');
    const sendBtn = document.getElementById('send-btn');
    const messageInput = document.getElementById('message-input');
    const fileUpload = document.getElementById('file-upload');
    const avatarInput = document.getElementById('avatar');
    
    joinBtn.addEventListener('click', joinChat);
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
    
    fileUpload.addEventListener('change', handleFileUpload);
    avatarInput.addEventListener('change', handleAvatarUpload);
    
    // 检查是否有保存的登录数据
    const savedUser = localStorage.getItem('chatUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        document.querySelector('.profile-section').style.display = 'none';
    }
    
    initWebSocket();
});

async function initWebSocket() {
    ws = new WebSocket('ws://' + window.location.hostname + ':8080');
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'delete') {
            // 删除被管理员删除的消息
            const messageElement = document.querySelector(`[data-message-id="${data.messageId}"]`);
            if (messageElement) {
                messageElement.remove();
            }
        } else if (data.type === 'clear_all') {
            // 清空所有消息
            const messagesContainer = document.getElementById('messages');
            messagesContainer.innerHTML = '';
        } else {
            displayMessage(data);
        }
    };

    // 获取历史消息
    try {
        const response = await fetch('/messages');
        const messages = await response.json();
        const messagesContainer = document.getElementById('messages');
        messagesContainer.innerHTML = ''; // 清空现有消息
        messages.forEach(message => {
            displayMessage(message);
        });
    } catch (error) {
        console.error('获取历史消息失败:', error);
    }
}

async function joinChat() {
    const nickname = document.getElementById('nickname').value.trim();
    if (!nickname) {
        alert('请输入昵称');
        return;
    }
    
    currentUser = {
        nickname: nickname,
        avatar: document.getElementById('avatar').dataset.avatarPath || 'images/default-avatar.png'
    };
    
    // 保存用户数据到localStorage
    localStorage.setItem('chatUser', JSON.stringify(currentUser));
    
    document.querySelector('.profile-section').style.display = 'none';
}

// 添加退出登录功能（可选）
function logout() {
    localStorage.removeItem('chatUser');
    currentUser = null;
    document.querySelector('.profile-section').style.display = 'flex';
}

function displayMessage(message) {
    const messagesContainer = document.getElementById('messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';
    messageDiv.dataset.messageId = message.id;
    
    // 判断是否为当前用户发送的消息
    if (currentUser && message.nickname === currentUser.nickname) {
        messageDiv.className += ' self';
    }
    
    // 判断是否为图片文件
    const isImage = message.type === 'file' && 
        (message.content.match(/\.(jpg|jpeg|png|gif|webp)$/i));
    
    messageDiv.innerHTML = `
        <img src="${message.avatar}" class="message-avatar">
        <div class="message-content">
            <div class="message-nickname">${message.nickname}</div>
            ${message.type === 'file' 
                ? isImage
                    ? `<img src="${message.content}" class="message-image" onclick="window.open('${message.content}', '_blank')">`
                    : `<a href="${message.content}" class="message-file-link" target="_blank">查看文件</a>`
                : `<div class="message-text">${message.content}</div>`
            }
        </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

async function sendMessage() {
    if (!currentUser) {
        alert('请先加入聊天');
        return;
    }
    
    const messageInput = document.getElementById('message-input');
    const message = messageInput.value.trim();
    
    if (message) {
        ws.send(JSON.stringify({
            type: 'text',
            content: message,
            nickname: currentUser.nickname,
            avatar: currentUser.avatar
        }));
        
        messageInput.value = '';
    }
}

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // 添加文件类型判断
    const isImage = file.type.startsWith('image/');
    if (!isImage && !file.type.match(/(pdf|doc|docx)$/i)) {
        alert('只支持图片、PDF和Word文档格式');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        ws.send(JSON.stringify({
            type: 'file',
            content: data.filePath,
            nickname: currentUser.nickname,
            avatar: currentUser.avatar
        }));
    } catch (error) {
        console.error('文件上传失败:', error);
        alert('文件上传失败');
    }
}

async function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('avatar', file);
    
    try {
        const response = await fetch('/upload-avatar', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        event.target.dataset.avatarPath = data.avatarPath;
    } catch (error) {
        console.error('头像上传失败:', error);
        alert('头像上传失败');
    }
}
