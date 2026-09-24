const mongoose = require('mongoose');
const { LocalUser } = require('../localDb');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' }
}, { timestamps: true });

const MongooseUser = mongoose.models.User || mongoose.model('User', userSchema);

// Hybrid model proxy
const UserProxy = new Proxy(MongooseUser, {
    get(target, prop) {
        if (mongoose.connection && mongoose.connection.readyState === 1) {
            return target[prop];
        }
        if (prop in LocalUser) {
            return LocalUser[prop];
        }
        return target[prop];
    }
});

module.exports = UserProxy;
