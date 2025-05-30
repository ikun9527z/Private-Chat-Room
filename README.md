# MyWeChat 聊天应用

## 项目简介
这是一个基于 WebSocket 的实时聊天应用，支持多人在线聊天、文件共享和消息管理功能。

## 功能特性
- 实时消息通信
- 用户头像和昵称设置
- 图片和文件分享
- 消息历史记录
- 管理员后台功能
- 移动端适配

## 技术架构
- 前端：原生 JavaScript、WebSocket
- 后端：Node.js、Express、SQLite3
- 文件处理：Multer
- 数据存储：SQLite 数据库

## 快速开始

### 环境要求
- Node.js >= 12.0.0
- npm >= 6.0.0

### 安装步骤
1. 克隆项目
```bash
git clone https://github.com/yourusername/MyWeChat.git](https://github.com/ikun9527z/Private-Chat-Room/tree/master
cd MyWeChat
```

2. 安装依赖
```bash
npm install
```

3. 启动服务器
```bash
npm start
```

4. 访问应用
- 聊天页面：http://localhost:8080
- 管理后台：http://localhost:8080/admin.html

## 项目结构
```
MyWeChat/
├── server.js           # 服务器入口
├── index.html          # 聊天主界面
├── admin.html          # 管理后台
├── css/               # 样式文件
├── js/                # 客户端脚本
├── images/            # 图片资源
└── uploads/           # 上传文件目录
```

## 开发指南
- 聊天功能位于 js/chat.js
- 管理功能位于 js/admin.js
- 样式定义在 css/style.css
- 服务器逻辑在 server.js

## 部署说明
1. 确保服务器已安装 Node.js
2. 配置环境变量
3. 启动命令：`npm start`
4. 建议使用 PM2 进行进程管理

## 贡献指南
1. Fork 项目
2. 创建特性分支
3. 提交改动
4. 发起 Pull Request

## 许可证
本项目采用 MIT 许可证
