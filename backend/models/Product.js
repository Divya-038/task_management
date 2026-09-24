const mongoose = require('mongoose');
const { LocalProduct } = require('../localDb');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    rating: { type: Number, default: 4.5, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0 },
    weight: { type: String, default: '1000gm' },
    category: {
        type: String,
        required: true,
        enum: ['Fruits & Vegetables', 'Bakery & Dairy', 'Groceries', 'Beverages', 'Meat & Seafood']
    },
    image: { type: String, default: 'assets/placeholder.jpg' },
    badge: { type: String, default: '' },
    badgeClass: { type: String, default: '' },
    stock: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

const MongooseProduct = mongoose.models.Product || mongoose.model('Product', productSchema);

// Hybrid model proxy: seamless Mongoose in production, LocalDb if MongoDB is offline
const ProductProxy = new Proxy(MongooseProduct, {
    get(target, prop) {
        if (mongoose.connection && mongoose.connection.readyState === 1) {
            return target[prop];
        }
        if (prop in LocalProduct) {
            return LocalProduct[prop];
        }
        return target[prop];
    }
});

module.exports = ProductProxy;
