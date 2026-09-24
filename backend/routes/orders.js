const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// POST /api/orders - Place new order (public, guest checkout allowed)
router.post('/', async (req, res) => {
    try {
        const { customerName, customerEmail, address, city, zip, phone, items, subtotal, discount, deliveryFee, total, paymentMethod, promoApplied, userId } = req.body;

        if (!customerName || !address || !city || !zip || !phone || !items || !items.length) {
            return res.status(400).json({ error: 'Missing required order fields.' });
        }

        const order = await Order.create({
            customerName, customerEmail,
            address, city, zip, phone,
            items, subtotal, discount,
            deliveryFee: deliveryFee || 5,
            total, paymentMethod,
            promoApplied: promoApplied || false,
            user: userId || null,
            status: 'pending'
        });

        res.status(201).json({
            message: 'Order placed successfully!',
            orderId: order.orderId,
            order
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/orders/track/:orderId - Track order by ID (public)
router.get('/track/:orderId', async (req, res) => {
    try {
        const order = await Order.findOne({ orderId: req.params.orderId });
        if (!order) return res.status(404).json({ error: 'Order not found. Please check the order ID.' });
        res.json(order);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/orders - Get all orders (admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/orders/my - Get logged in user's orders
router.get('/my', authenticateToken, async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/orders/:id/status - Update order status (admin only)
router.put('/:id/status', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status value.' });
        }

        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );
        if (!order) return res.status(404).json({ error: 'Order not found' });
        res.json({ message: 'Order status updated', order });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/orders/stats - Dashboard stats (admin only)
router.get('/stats/summary', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const totalOrders = await Order.countDocuments();
        const pendingOrders = await Order.countDocuments({ status: 'pending' });
        const deliveredOrders = await Order.countDocuments({ status: 'delivered' });
        const revenue = await Order.aggregate([
            { $match: { status: { $ne: 'cancelled' } } },
            { $group: { _id: null, total: { $sum: '$total' } } }
        ]);

        res.json({
            totalOrders,
            pendingOrders,
            deliveredOrders,
            totalRevenue: revenue.length ? revenue[0].total.toFixed(2) : '0.00'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
