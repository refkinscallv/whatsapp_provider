# WARF - WhatsApp API Gateway (Enterprise Edition)

A professional-grade WhatsApp API Gateway built with Node.js, Express, Sequelize, and WhatsApp-Web.js. Features a premium dark-themed web dashboard, robust message queuing, and automated campaign management.

## 🚀 Features

- **Premium Web Dashboard**: Dark-themed, responsive UI with glassmorphism aesthetics.
- **Device Management**: Connect multiple WhatsApp instances via QR code synchronization.
- **Unified Messaging**: Support for individual and bulk messaging (Text & Media).
- **Automated Campaigns**: Schedule broadcasts with configurable delays to maintain account safety.
- **Intelligent Auto-Replies**: Keyword-based automated response system with hit tracking.
- **Contact Management**: Sync WhatsApp contacts and organize them into custom contact books.
- **Developer Friendly**: Secure REST API with API Key authentication and Webhook support.
- **Reliable Queuing**: Priority-based message queue with automatic retry logic.
- **Subscription Engine**: Built-in pricing plan and subscription management.

## 🛠️ Tech Stack

- **Backend**: Node.js, Express, Sequelize (MariaDB/MySQL)
- **WhatsApp Engine**: WhatsApp-Web.js (WWebJS)
- **Frontend**: EJS, Tailwind CSS, DaisyUI
- **Real-time**: Socket.IO
- **Task Scheduling**: Node-Cron

## 📋 Prerequisites

- Node.js v18 or higher
- MariaDB / MySQL Server
- Chromium (for WhatsApp-Web.js headless browser)

## ⚙️ Installation

1. **Clone the repository**:
   ```bash
   git clone <repository_url>
   cd whatsapp_provider
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment**:
   Copy `.env.example` to `.env` and update your database credentials and secrets.
   ```bash
   cp .env.example .env
   ```

4. **Initialize Database**:
   ```bash
   # Create database if not exists, then:
   npm run migrate
   ```

5. **Start the Application**:
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

## 🔒 Security

- **JWT Authentication**: Secured web routes with cross-site cookie protection.
- **API Keys**: Per-app access tokens with domain/IP whitelisting.
- **Secure Sessions**: Persistent WhatsApp sessions stored locally and managed via the dashboard.

## 📖 API Documentation

The API endpoints are grouped logically:
- `/api/auth`: User registration and login
- `/api/devices`: Device pairing and status
- `/api/messages`: Sending and queue management
- `/api/campaigns`: Multi-recipient broadcasts
- `/api/contacts`: Contact and book management
- `/api/templates`: Message template CRUD
- `/api/auto-replies`: Automation rules
- `/api/webhooks`: External event notification config

Visit the internal `/api-docs` on your local installation for detailed schema and examples.

## 📄 License

Proprietary License - All rights reserved.
