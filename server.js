const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// 创建必要的目录
const dirs = ['images', 'images/avatars', 'uploads'];
dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// 创建数据库连接
const db = new sqlite3.Database('chat.db');

// 创建数据库表
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nickname TEXT,
        avatar TEXT,
        content TEXT,
        type TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

// 添加图片hash存储
const imageHashes = new Map();

// 添加头像hash存储
const avatarHashes = new Map();

// 计算文件hash的函数
function calculateFileHash(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
}

// 配置文件上传
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dest = file.fieldname === 'avatar' ? 'images/avatars' : 'uploads';
        // 确保目录存在
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        // 临时保存文件以计算hash
        const tempPath = path.join(__dirname, 'temp_' + file.originalname);
        req.tempPath = tempPath;
        cb(null, 'temp_' + file.originalname);
    }
});

const upload = multer({ storage });

// 静态文件服务
app.use(express.static(__dirname));

// 文件上传路由
app.post('/upload', upload.single('file'), (req, res) => {
    const file = req.file;
    if (!file) {
        return res.status(400).json({ error: '没有文件上传' });
    }

    try {
        // 计算文件hash
        const fileHash = calculateFileHash(file.path);
        
        // 检查是否存在相同的图片
        if (imageHashes.has(fileHash)) {
            // 如果存在，删除新上传的文件
            fs.unlinkSync(file.path);
            // 返回已存在的文件路径
            return res.json({ filePath: imageHashes.get(fileHash) });
        }

        // 如果是新图片，重命名为正式文件名
        const newFilename = Date.now() + path.extname(file.originalname);
        const newPath = path.join(file.destination, newFilename);
        fs.renameSync(file.path, newPath);
        
        // 保存hash和路径的映射
        const relativePath = '/' + path.relative(__dirname, newPath).replace(/\\/g, '/');
        imageHashes.set(fileHash, relativePath);
        
        res.json({ filePath: relativePath });
    } catch (error) {
        console.error('文件处理失败:', error);
        res.status(500).json({ error: '文件处理失败' });
    }
});

app.post('/upload-avatar', upload.single('avatar'), (req, res) => {
    const file = req.file;
    if (!file) {
        return res.status(400).json({ error: '没有文件上传' });
    }

    try {
        const fileHash = calculateFileHash(file.path);
        
        // 检查是否存在相同的头像
        if (avatarHashes.has(fileHash)) {
            fs.unlinkSync(file.path);
            return res.json({ avatarPath: avatarHashes.get(fileHash) });
        }

        const newFilename = Date.now() + path.extname(file.originalname);
        const newPath = path.join(file.destination, newFilename);
        fs.renameSync(file.path, newPath);
        
        const relativePath = '/' + path.relative(__dirname, newPath).replace(/\\/g, '/');
        avatarHashes.set(fileHash, relativePath);
        
        res.json({ avatarPath: relativePath });
    } catch (error) {
        console.error('头像处理失败:', error);
        res.status(500).json({ error: '头像处理失败' });
    }
});

// 添加获取历史消息的路由
app.get('/messages', (req, res) => {
    db.all('SELECT * FROM messages ORDER BY timestamp DESC LIMIT 50', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows.reverse()); // 反转数组以获得正确的时间顺序
    });
});

// 添加管理端API接口
app.get('/admin/messages', (req, res) => {
    db.all('SELECT * FROM messages ORDER BY timestamp DESC', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// 添加清空所有聊天记录的API - 需要放在单条删除之前
app.delete('/admin/messages/all', (req, res) => {
    // 先获取所有文件类型的消息
    db.all('SELECT * FROM messages WHERE type = "file"', (err, messages) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        // 删除所有相关文件
        messages.forEach(message => {
            if (message && message.content) {  // 添加空值检查
                const filePath = path.join(__dirname, message.content.replace(/^\//, ''));
                if (fs.existsSync(filePath)) {
                    try {
                        fs.unlinkSync(filePath);
                    } catch (error) {
                        console.error('文件删除失败:', error);
                    }
                }
            }
        });
        
        // 清空数据库
        db.run('DELETE FROM messages', (err) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            
            // 清空图片和头像哈希映射
            imageHashes.clear();
            avatarHashes.clear();
            
            res.json({ message: 'all messages deleted' });
            
            // 通知所有客户端清空消息
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        type: 'clear_all'
                    }));
                }
            });
        });
    });
});

app.delete('/admin/messages/:id', (req, res) => {
    const id = req.params.id;
    
    // 先获取消息信息
    db.get('SELECT * FROM messages WHERE id = ?', id, (err, message) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        // 如果是文件类型的消息，删除对应的文件
        if (message && message.type === 'file') {
            const filePath = path.join(__dirname, message.content.replace('/', ''));
            if (fs.existsSync(filePath)) {
                try {
                    fs.unlinkSync(filePath);
                } catch (error) {
                    console.error('文件删除失败:', error);
                }
            }
        }
        
        // 删除数据库记录
        db.run('DELETE FROM messages WHERE id = ?', id, (err) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ message: 'deleted' });
            
            // 通知所有客户端消息已删除
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        type: 'delete',
                        messageId: id
                    }));
                }
            });
        });
    });
});

// WebSocket连接处理
wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        const data = JSON.parse(message);
        
        // 保存消息到数据库
        db.run(
            'INSERT INTO messages (nickname, avatar, content, type) VALUES (?, ?, ?, ?)',
            [data.nickname, data.avatar, data.content, data.type]
        );
        
        // 广播消息给所有客户端
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(data));
            }
        });
    });
});

// 启动服务器
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});
