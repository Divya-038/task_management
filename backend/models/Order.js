const mongoose = require('mongoose');
const { LocalOrder } = require('../localDb');

const orderItemSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: String,
    price: Number,
    quantity: Number,
    image: String
});

const orderSchema = new mongoose.Schema({
    orderId: { type: String, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    customerName: { type: String, required: true },
    customerEmail: { type: String, default: '' },
    address: { type: String, required: true },
    city: { type: String, required: true },
    zip: { type: String, required: true },
    phone: { type: String, required: true },
    items: [orderItemSchema],
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    deliveryFee: { type: Number, default: 5 },
    total: { type: Number, required: true },
    paymentMethod: { type: String, enum: ['card', 'paypal', 'cod'], default: 'cod' },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
        default: 'pending'
    },
    promoApplied: { type: Boolean, default: false }
}, { timestamps: true });

// Auto-generate order ID before saving
orderSchema.pre('save', function(next) {
    if (!this.orderId) {
        this.orderId = 'TZ-' + Math.floor(10000 + Math.random() * 90000) + '-' + Date.now().toString().slice(-4);
    }
    next();
});

const MongooseOrder = mongoose.models.Order || mongoose.model('Order', orderSchema);

// Hybrid model proxy
const OrderProxy = new Proxy(MongooseOrder, {
    get(target, prop) {
        if (mongoose.connection && mongoose.connection.readyState === 1) {
            return target[prop];
        }
        if (prop in LocalOrder) {
            return LocalOrder[prop];
        }
        return target[prop];
    }
});

module.exports = OrderProxy;
