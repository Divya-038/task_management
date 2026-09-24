require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./backend/routes/auth');
const productRoutes = require('./backend/routes/products');
const orderRoutes = require('./backend/routes/orders');
const { loadDb } = require('./backend/localDb');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'frontend')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

// Catch-all: serve index.html for client-side routing on non-API GET requests
app.get('/{*path}', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Start Express Server
function startServer(dbMode) {
    app.listen(PORT, () => {
        console.log('====================================================');
        console.log(`🚀 TazajMart Server is LIVE at http://localhost:${PORT}`);
        console.log(`📦 Database Mode: ${dbMode}`);
        console.log('----------------------------------------------------');
        console.log(`🛒 Storefront:   http://localhost:${PORT}`);
        console.log(`🔐 Login Page:   http://localhost:${PORT}/login.html`);
        console.log(`⚡ Admin Panel:  http://localhost:${PORT}/admin.html`);
        console.log('👤 Admin Login:  admin@tazajmart.com / admin123');
        console.log('====================================================');
    });
}

// MongoDB Connection with seamless fallback
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/tazajmart';

console.log('🔄 Checking database connection...');

mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 2000 })
    .then(async () => {
        console.log('✅ MongoDB connected successfully');
        await seedMongoData();
        startServer('MongoDB (Production / Atlas / Local)');
    })
    .catch((err) => {
        console.log(`⚠️  Local MongoDB service not running (${err.message}).`);
        console.log('✨ Auto-switching to Local Persistent JSON Store.');
        loadDb();
        startServer('Local Persistent Engine (Zero-Config)');
    });

// Seed default admin + sample products if MongoDB is used
async function seedMongoData() {
    try {
        const User = require('./backend/models/User');
        const Product = require('./backend/models/Product');
        const bcrypt = require('bcryptjs');

        const adminExists = await User.findOne({ email: 'admin@tazajmart.com' });
        if (!adminExists) {
            const hashedPwd = await bcrypt.hash('admin123', 10);
            await User.create({
                name: 'Admin User',
                email: 'admin@tazajmart.com',
                password: hashedPwd,
                role: 'admin'
            });
            console.log('👤 Admin user seeded: admin@tazajmart.com / admin123');
        }

        const productCount = await Product.countDocuments();
        if (productCount === 0) {
            const sampleProducts = [
                { name: 'Organic Green Big Sweet Pepper Seeds - Capsicum', price: 24.00, rating: 4.8, ratingCount: 120, weight: '1000gm', category: 'Fruits & Vegetables', image: 'assets/capsicum.jpg', badge: 'Best Sale', badgeClass: 'best-sale', stock: 50 },
                { name: 'Seoul Yopokki Spicy 4 Flavors of Korean Topokki', price: 24.00, rating: 4.7, ratingCount: 85, weight: '1000gm', category: 'Groceries', image: 'assets/yopokki.jpg', badge: 'Best Sale', badgeClass: 'best-sale', stock: 30 },
                { name: 'Cavendish banana Malaysia Premium', price: 0.40, rating: 4.9, ratingCount: 340, weight: '1000gm', category: 'Fruits & Vegetables', image: 'assets/bananas.jpg', badge: 'New', badgeClass: 'new', stock: 200 },
                { name: 'Organic Italian Hass 100% Natural Avocado', price: 12.35, rating: 4.8, ratingCount: 95, weight: '1000gm', category: 'Fruits & Vegetables', image: 'assets/avocado.jpg', badge: 'New', badgeClass: 'new', stock: 40 },
                { name: 'Tazaj Mart Full Cream Fresh Milk 4pack', price: 24.00, rating: 4.6, ratingCount: 150, weight: '1000gm', category: 'Bakery & Dairy', image: 'assets/milk.jpg', badge: 'Best Sale', badgeClass: 'best-sale', stock: 60 },
                { name: 'Arabian Beef Meat Kirkland Signature Roast', price: 24.00, rating: 4.9, ratingCount: 64, weight: '1000gm', category: 'Meat & Seafood', image: 'assets/beef.jpg', badge: 'Best Sale', badgeClass: 'best-sale', stock: 20 },
                { name: 'APILIFE - Flavorful & Nutritional Black Seed Honey', price: 30.25, rating: 4.9, ratingCount: 110, weight: '1000gm', category: 'Groceries', image: 'assets/honey.jpg', badge: 'Best Sale', badgeClass: 'best-sale', stock: 35 },
                { name: 'Lemon Big Imported from South Africa', price: 4.40, rating: 4.7, ratingCount: 142, weight: '1000gm', category: 'Fruits & Vegetables', image: 'assets/lemon.jpg', badge: 'Best Sale', badgeClass: 'best-sale', stock: 100 },
                { name: 'Lipton Lemon Green Tea from China', price: 2.35, rating: 4.5, ratingCount: 210, weight: '1000gm', category: 'Beverages', image: 'assets/greentea.jpg', badge: 'New', badgeClass: 'new', stock: 80 },
                { name: "Lay's Tomato Ketchup Chips 12 Pack", price: 4.40, rating: 4.7, ratingCount: 310, weight: '1000gm', category: 'Groceries', image: 'assets/chips.jpg', badge: '10% OFF', badgeClass: 'discount', stock: 120 }
            ];
            await Product.insertMany(sampleProducts);
            console.log('🛍️  Sample products seeded to MongoDB');
        }
    } catch (e) {
        console.error('Error seeding MongoDB data:', e);
    }
}
