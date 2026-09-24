# TazajMart - Full-Stack E-Commerce Web Application

A complete full-stack grocery e-commerce platform built with **Node.js + Express + MongoDB** (backend) and **Vanilla HTML/CSS/JS** (frontend).

---

## ✅ Task Requirements Completed

| Feature | Status |
|---|---|
| Product catalog with categories & filtering | ✅ Done |
| Add to cart & checkout functionality | ✅ Done |
| User login & role-based access (Admin/User) | ✅ Done |
| Admin panel for product management | ✅ Done |
| Backend APIs (REST) | ✅ Done |
| Database integration (MongoDB) | ✅ Done |
| Order tracking by Order ID | ✅ Done |

---

## 📁 Project Structure

```
task2/
├── server.js                  # Main Express server (entry point)
├── .env                       # Environment variables
├── package.json               # Node.js project config
├── backend/
│   ├── models/
│   │   ├── User.js            # User schema (name, email, password, role)
│   │   ├── Product.js         # Product schema
│   │   └── Order.js           # Order schema with status tracking
│   ├── routes/
│   │   ├── auth.js            # /api/auth - Login & Register
│   │   ├── products.js        # /api/products - Product CRUD
│   │   └── orders.js          # /api/orders - Order management
│   └── middleware/
│       └── auth.js            # JWT authentication middleware
└── frontend/
    ├── index.html             # Main store page
    ├── login.html             # Login / Register page
    ├── admin.html             # Admin dashboard
    ├── app.js                 # Frontend JavaScript (API-connected)
    └── style.css              # Styling
```

---

## 🚀 Manual Deployment Guide

### Prerequisites

Install these before starting:

1. **Node.js** (v18+) → https://nodejs.org/
2. **MongoDB Community Server** (local) → https://www.mongodb.com/try/download/community  
   OR use **MongoDB Atlas** (free cloud DB) → https://cloud.mongodb.com

---

### Step 1 — Install Dependencies

Open a terminal in the `task2/` folder and run:

```powershell
npm install
```

---

### Step 2 — Configure Environment

Edit the `.env` file in the root:

```env
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/tazajmart
JWT_SECRET=tazajmart_super_secret_jwt_key_2026
```

> **Using MongoDB Atlas?** Replace `MONGO_URI` with your Atlas connection string:  
> `MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/tazajmart`

---

### Step 3 — Start MongoDB (if using local)

**Option A: Windows Service** (if installed as a service, it auto-starts)

**Option B: Manual start:**
```powershell
mongod --dbpath "C:\data\db"
```
> First time: create the data directory: `mkdir C:\data\db`

---

### Step 4 — Start the Server

```powershell
npm start
```

You should see:
```
✅ MongoDB connected successfully
👤 Admin user seeded: admin@tazajmart.com / admin123
🛍️  Sample products seeded
🚀 TazajMart server running at http://localhost:3000
   Admin Panel: http://localhost:3000/admin.html
   Login Page:  http://localhost:3000/login.html
```

---

### Step 5 — Open the App

| URL | Description |
|---|---|
| http://localhost:3000 | Main Store |
| http://localhost:3000/login.html | Login / Register |
| http://localhost:3000/admin.html | Admin Dashboard |

---

## 🔑 Default Login Credentials

| Role | Email | Password |
|---|---|---|
| **Admin** | admin@tazajmart.com | admin123 |
| **User** | Register a new account | Any password (6+ chars) |

---

## 🌐 API Reference

### Auth Endpoints
| Method | URL | Description | Auth |
|---|---|---|---|
| POST | `/api/auth/register` | Register new user | Public |
| POST | `/api/auth/login` | Login and get JWT token | Public |
| GET | `/api/auth/me` | Get current user info | User/Admin |

### Product Endpoints
| Method | URL | Description | Auth |
|---|---|---|---|
| GET | `/api/products` | Get all active products | Public |
| GET | `/api/products/all` | Get all products (incl. inactive) | Admin |
| POST | `/api/products` | Add new product | Admin |
| PUT | `/api/products/:id` | Update product | Admin |
| DELETE | `/api/products/:id` | Delete product | Admin |

### Order Endpoints
| Method | URL | Description | Auth |
|---|---|---|---|
| POST | `/api/orders` | Place a new order | Public |
| GET | `/api/orders/track/:orderId` | Track order by ID | Public |
| GET | `/api/orders` | Get all orders | Admin |
| PUT | `/api/orders/:id/status` | Update order status | Admin |
| GET | `/api/orders/stats/summary` | Dashboard stats | Admin |

---

## ☁️ Cloud Deployment Options

### Option A: Railway (Recommended - Free Tier)

1. Push project to GitHub
2. Go to https://railway.app → New Project → Deploy from GitHub
3. Add environment variables in Railway dashboard:
   - `MONGO_URI` = your MongoDB Atlas URI
   - `JWT_SECRET` = your secret key
4. Railway auto-detects Node.js and deploys

### Option B: Render.com (Free Tier)

1. Push project to GitHub
2. Go to https://render.com → New Web Service → Connect GitHub
3. Set:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Add environment variables in Render dashboard

### Option C: VPS / Server (Ubuntu)

```bash
# SSH into your server
ssh user@your-server-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update && sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod

# Clone your project
git clone <your-repo-url> app
cd app
npm install

# Install PM2 for process management
sudo npm install -g pm2
pm2 start server.js --name tazajmart
pm2 save
pm2 startup
```

---

## 🛠️ Troubleshooting

| Problem | Fix |
|---|---|
| `MongoDB connection error` | Make sure MongoDB is running: `mongod --dbpath C:\data\db` |
| `Port 3000 already in use` | Change `PORT=3001` in `.env` |
| `ENOENT: no such file` | Run `npm install` to install packages |
| Products don't load | Check browser console — backend may not be running |
| Admin login denied | Use `admin@tazajmart.com` / `admin123` |
| Atlas connection fails | Check your IP is whitelisted in Atlas Network Access |
