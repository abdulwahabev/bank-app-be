const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, unique: true, required: true, lowercase: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },

    // Naya Status Logic
    status: {
        type: String,
        enum: ['incomplete', 'pending', 'active', 'rejected', 'blocked'],
        default: 'incomplete'
    },

    // KYC Details (Pakistan Specific)
    kycDetails: {
        cnic: { type: String, default: "" },
        address: { type: String, default: "" },
        accountType: { type: String, default: "Saving" },
        initialDeposit: { type: Number, default: 0 }
    },

    accountNumber: { type: String, unique: true, sparse: true }, // sparse allows multiple nulls
    balance: { type: Number, default: 0 },

    cardDetails: {
        cardNumber: { type: String },
        cvv: { type: String },
        expiryDate: { type: String, default: "08/32" },
        isFrozen: { type: Boolean, default: false },
        dailyLimit: { type: Number, default: 50000 }
    },

    role: { type: String, enum: ['user', 'admin'], default: 'user' }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);