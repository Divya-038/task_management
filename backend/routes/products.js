const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// GET /api/products - Get all active products (public)
router.get('/', async (req, res) => {
    try {
        const { category, search, sort } = req.query;
        let query = { isActive: true };

        if (category && category !== 'all') {
            query.category = category;
        }
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { category: { $regex: search, $options: 'i' } }
            ];
        }

        let sortOption = {};
        if (sort === 'price-low') sortOption.price = 1;
        else if (sort === 'price-high') sortOption.price = -1;
        else if (sort === 'rating') sortOption.rating = -1;

        const products = await Product.find(query).sort(sortOption);
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/products/all - Get ALL products including inactive (admin only)
router.get('/all', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const products = await Product.find().sort({ createdAt: -1 });
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/products/:id - Get single product (public)
router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ error: 'Product not found' });
        res.json(product);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/products - Add new product (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { name, price, category, weight, image, badge, badgeClass, stock, rating, ratingCount } = req.body;

        if (!name || !price || !category) {
            return res.status(400).json({ error: 'Name, price, and category are required.' });
        }

        const product = await Product.create({
            name, price, category,
            weight: weight || '1000gm',
            image: image || 'assets/placeholder.jpg',
            badge: badge || '',
            badgeClass: badgeClass || '',
            stock: stock || 0,
            rating: rating || 4.5,
            ratingCount: ratingCount || 0
        });

        res.status(201).json({ message: 'Product added successfully', product });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/products/:id - Update product (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!product) return res.status(404).json({ error: 'Product not found' });
        res.json({ message: 'Product updated', product });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/products/:id - Delete product (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) return res.status(404).json({ error: 'Product not found' });
        res.json({ message: 'Product deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
