document.addEventListener('DOMContentLoaded', () => {
    loadMessages();
});

async function loadMessages() {
    try {
        const response = await fetch('/admin/messages');
        const messages = await response.json();
        displayMessages(messages);
    } catch (error) {
        console.error('加载消息失败:', error);
    }
}

function displayMessages(messages) {
    const tbody = document.querySelector('#messageTable tbody');
    tbody.innerHTML = messages.map(message => `
        <tr>
            <td>${message.nickname}</td>
            <td>${message.type === 'file' ? '文件' : message.content}</td>
            <td>${message.type}</td>
            <td>${new Date(message.timestamp).toLocaleString()}</td>
            <td>
                <button class="delete-btn" onclick="deleteMessage(${message.id})">删除</button>
            </td>
        </tr>
    `).join('');
}

async function deleteMessage(id) {
    if (!confirm('确定要删除这条消息吗？删除后相关文件也会被永久删除！')) return;
    
    try {
        const response = await fetch(`/admin/messages/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            loadMessages(); // 重新加载消息列表
        } else {
            const error = await response.json();
            alert('删除失败: ' + error.error);
        }
    } catch (error) {
        console.error('删除失败:', error);
        alert('删除失败');
    }
}

async function clearAllMessages() {
    if (!confirm('确定要清空所有聊天记录吗？所有消息和相关文件将被永久删除！')) return;
    
    try {
        const response = await fetch('/admin/messages/all', {
            method: 'DELETE'
        });
        
        if (response.ok) {
            loadMessages(); // 重新加载消息列表
            alert('所有聊天记录已清空');
        } else {
            const error = await response.json();
            alert('清空失败: ' + error.error);
        }
    } catch (error) {
        console.error('清空失败:', error);
        alert('清空失败');
    }
}
