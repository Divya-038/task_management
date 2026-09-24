const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Initial default products
const DEFAULT_PRODUCTS = [
    { _id: '64f001', name: 'Organic Green Big Sweet Pepper Seeds - Capsicum', price: 24.00, rating: 4.8, ratingCount: 120, weight: '1000gm', category: 'Fruits & Vegetables', image: 'assets/capsicum.jpg', badge: 'Best Sale', badgeClass: 'best-sale', stock: 50, isActive: true },
    { _id: '64f002', name: 'Seoul Yopokki Spicy 4 Flavors of Korean Topokki', price: 24.00, rating: 4.7, ratingCount: 85, weight: '1000gm', category: 'Groceries', image: 'assets/yopokki.jpg', badge: 'Best Sale', badgeClass: 'best-sale', stock: 30, isActive: true },
    { _id: '64f003', name: 'Cavendish banana Malaysia Premium', price: 0.40, rating: 4.9, ratingCount: 340, weight: '1000gm', category: 'Fruits & Vegetables', image: 'assets/bananas.jpg', badge: 'New', badgeClass: 'new', stock: 200, isActive: true },
    { _id: '64f004', name: 'Organic Italian Hass 100% Natural Avocado', price: 12.35, rating: 4.8, ratingCount: 95, weight: '1000gm', category: 'Fruits & Vegetables', image: 'assets/avocado.jpg', badge: 'New', badgeClass: 'new', stock: 40, isActive: true },
    { _id: '64f005', name: 'Tazaj Mart Full Cream Fresh Milk 4pack', price: 24.00, rating: 4.6, ratingCount: 150, weight: '1000gm', category: 'Bakery & Dairy', image: 'assets/milk.jpg', badge: 'Best Sale', badgeClass: 'best-sale', stock: 60, isActive: true },
    { _id: '64f006', name: 'Arabian Beef Meat Kirkland Signature Roast', price: 24.00, rating: 4.9, ratingCount: 64, weight: '1000gm', category: 'Meat & Seafood', image: 'assets/beef.jpg', badge: 'Best Sale', badgeClass: 'best-sale', stock: 20, isActive: true },
    { _id: '64f007', name: 'APILIFE - Flavorful & Nutritional Black Seed Honey', price: 30.25, rating: 4.9, ratingCount: 110, weight: '1000gm', category: 'Groceries', image: 'assets/honey.jpg', badge: 'Best Sale', badgeClass: 'best-sale', stock: 35, isActive: true },
    { _id: '64f008', name: 'Lemon Big Imported from South Africa', price: 4.40, rating: 4.7, ratingCount: 142, weight: '1000gm', category: 'Fruits & Vegetables', image: 'assets/lemon.jpg', badge: 'Best Sale', badgeClass: 'best-sale', stock: 100, isActive: true },
    { _id: '64f009', name: 'Lipton Lemon Green Tea from China', price: 2.35, rating: 4.5, ratingCount: 210, weight: '1000gm', category: 'Beverages', image: 'assets/greentea.jpg', badge: 'New', badgeClass: 'new', stock: 80, isActive: true },
    { _id: '64f010', name: "Lay's Tomato Ketchup Chips 12 Pack", price: 4.40, rating: 4.7, ratingCount: 310, weight: '1000gm', category: 'Groceries', image: 'assets/chips.jpg', badge: '10% OFF', badgeClass: 'discount', stock: 120, isActive: true }
];

let db = {
    users: [],
    products: [],
    orders: []
};

function generateId() {
    return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

function loadDb() {
    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        if (fs.existsSync(DB_FILE)) {
            const raw = fs.readFileSync(DB_FILE, 'utf8');
            db = JSON.parse(raw);
        } else {
            initSeed();
        }
    } catch (e) {
        console.error('Error loading db.json:', e);
        initSeed();
    }
}

function initSeed() {
    const defaultPassword = bcrypt.hashSync('admin123', 10);
    db = {
        users: [
            {
                _id: 'user_admin_01',
                name: 'Admin User',
                email: 'admin@tazajmart.com',
                password: defaultPassword,
                role: 'admin',
                createdAt: new Date().toISOString()
            }
        ],
        products: DEFAULT_PRODUCTS.map(p => ({
            ...p,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        })),
        orders: []
    };
    saveDb();
}

function saveDb() {
    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
    } catch (e) {
        console.error('Error saving db.json:', e);
    }
}

// Initial load
loadDb();

// Chainable query helper
class QueryPromise extends Promise {
    constructor(executor) {
        super(executor);
        this._sortOptions = null;
        this._selectFields = null;
    }

    sort(options) {
        return this.then(list => {
            if (!Array.isArray(list)) return list;
            const res = [...list];
            if (options.price === 1) res.sort((a, b) => a.price - b.price);
            else if (options.price === -1) res.sort((a, b) => b.price - a.price);
            else if (options.rating === -1) res.sort((a, b) => b.rating - a.rating);
            else if (options.createdAt === -1) res.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            return res;
        });
    }

    select(fields) {
        return this.then(item => {
            if (!item) return null;
            const copy = { ...item };
            if (fields.includes('-password')) {
                delete copy.password;
            }
            return copy;
        });
    }
}

// Product Mock Model
const LocalProduct = {
    find(query = {}) {
        return new QueryPromise((resolve) => {
            let res = [...db.products];
            if (query.isActive !== undefined) {
                res = res.filter(p => p.isActive === query.isActive);
            }
            if (query.category && query.category !== 'all') {
                res = res.filter(p => p.category === query.category);
            }
            if (query.$or) {
                const searchRegexes = query.$or.map(cond => {
                    const key = Object.keys(cond)[0];
                    return { key, regex: new RegExp(cond[key].$regex, cond[key].$options || 'i') };
                });
                res = res.filter(p => searchRegexes.some(({ key, regex }) => regex.test(p[key] || '')));
            }
            resolve(res);
        });
    },

    findById(id) {
        return new QueryPromise((resolve) => {
            const found = db.products.find(p => String(p._id) === String(id));
            resolve(found ? { ...found } : null);
        });
    },

    create(data) {
        return new Promise((resolve) => {
            const newDoc = {
                _id: generateId(),
                ...data,
                isActive: data.isActive !== undefined ? data.isActive : true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            db.products.unshift(newDoc);
            saveDb();
            resolve(newDoc);
        });
    },

    insertMany(docs) {
        return new Promise((resolve) => {
            const created = docs.map(d => ({
                _id: d._id || generateId(),
                ...d,
                isActive: d.isActive !== undefined ? d.isActive : true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }));
            db.products.push(...created);
            saveDb();
            resolve(created);
        });
    },

    findByIdAndUpdate(id, update, opts = {}) {
        return new Promise((resolve) => {
            const index = db.products.findIndex(p => String(p._id) === String(id));
            if (index === -1) return resolve(null);
            db.products[index] = {
                ...db.products[index],
                ...update,
                updatedAt: new Date().toISOString()
            };
            saveDb();
            resolve(db.products[index]);
        });
    },

    findByIdAndDelete(id) {
        return new Promise((resolve) => {
            const index = db.products.findIndex(p => String(p._id) === String(id));
            if (index === -1) return resolve(null);
            const [deleted] = db.products.splice(index, 1);
            saveDb();
            resolve(deleted);
        });
    },

    countDocuments(query = {}) {
        return new Promise((resolve) => {
            let count = db.products.length;
            if (query.isActive !== undefined) {
                count = db.products.filter(p => p.isActive === query.isActive).length;
            }
            resolve(count);
        });
    }
};

// User Mock Model
const LocalUser = {
    findOne(query = {}) {
        return new Promise((resolve) => {
            let found = null;
            if (query.email) {
                found = db.users.find(u => u.email.toLowerCase() === query.email.toLowerCase());
            } else if (query._id) {
                found = db.users.find(u => String(u._id) === String(query._id));
            }
            resolve(found ? { ...found } : null);
        });
    },

    findById(id) {
        return new QueryPromise((resolve) => {
            const found = db.users.find(u => String(u._id) === String(id));
            resolve(found ? { ...found } : null);
        });
    },

    create(data) {
        return new Promise((resolve) => {
            const newDoc = {
                _id: generateId(),
                name: data.name,
                email: data.email.toLowerCase(),
                password: data.password,
                role: data.role || 'user',
                createdAt: new Date().toISOString()
            };
            db.users.push(newDoc);
            saveDb();
            resolve(newDoc);
        });
    }
};

// Order Mock Model
const LocalOrder = {
    create(data) {
        return new Promise((resolve) => {
            const orderId = 'TZ-' + Math.floor(10000 + Math.random() * 90000) + '-' + Date.now().toString().slice(-4);
            const newDoc = {
                _id: generateId(),
                orderId,
                ...data,
                status: data.status || 'pending',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            db.orders.unshift(newDoc);
            saveDb();
            resolve(newDoc);
        });
    },

    findOne(query = {}) {
        return new Promise((resolve) => {
            let found = null;
            if (query.orderId) {
                found = db.orders.find(o => o.orderId.toLowerCase() === query.orderId.toLowerCase());
            } else if (query._id) {
                found = db.orders.find(o => String(o._id) === String(query._id));
            }
            resolve(found ? { ...found } : null);
        });
    },

    find(query = {}) {
        return new QueryPromise((resolve) => {
            let res = [...db.orders];
            if (query.user) {
                res = res.filter(o => String(o.user) === String(query.user));
            }
            if (query.status) {
                res = res.filter(o => o.status === query.status);
            }
            resolve(res);
        });
    },

    findByIdAndUpdate(id, update, opts = {}) {
        return new Promise((resolve) => {
            const index = db.orders.findIndex(o => String(o._id) === String(id));
            if (index === -1) return resolve(null);
            db.orders[index] = {
                ...db.orders[index],
                ...update,
                updatedAt: new Date().toISOString()
            };
            saveDb();
            resolve(db.orders[index]);
        });
    },

    countDocuments(query = {}) {
        return new Promise((resolve) => {
            let res = db.orders;
            if (query.status) {
                res = res.filter(o => o.status === query.status);
            }
            resolve(res.length);
        });
    },

    aggregate(pipeline = []) {
        return new Promise((resolve) => {
            let activeOrders = db.orders.filter(o => o.status !== 'cancelled');
            const total = activeOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
            resolve([{ _id: null, total }]);
        });
    }
};

module.exports = {
    LocalProduct,
    LocalUser,
    LocalOrder,
    loadDb,
    saveDb
};
