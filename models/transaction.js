const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    senderName: { type: String },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Optional for deposit
    receiverName: { type: String },
    receiverAccountNumber: { type: String },
    amount: { type: Number, required: true },
    description: { type: String },
    type: { type: String, enum: ['transfer', 'deposit', 'withdraw'], default: 'transfer' },
    status: { type: String, enum: ['pending', 'success', 'failed'], default: 'success' },
    senderBalance: { type: Number }, // Balance after transaction for sender
    receiverBalance: { type: Number }, // Balance after transaction for receiver
    transactionId: { type: String, unique: true }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);