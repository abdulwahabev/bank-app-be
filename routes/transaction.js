const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Transaction = require('../models/transaction');
const { verifyToken } = require('../middlewares/auth');
const crypto = require('crypto');
const mongoose = require('mongoose');

// --- TRANSFER API ---
router.post('/transfer', verifyToken, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { accountNumber, amount, description } = req.body;
        const senderId = req.user.id;

        // Fetch sender and receiver within the session
        const sender = await User.findById(senderId).session(session);
        const receiver = await User.findOne({ accountNumber }).session(session);

        if (!receiver) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ success: false, message: "Account number is Invalid!" });
        }

        if (sender.accountNumber === accountNumber) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ success: false, message: "You can't send money to your own account!" });
        }

        if (sender.balance < amount) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ success: false, message: "Insufficient balance!" });
        }

        // Update balances
        sender.balance -= Number(amount);
        receiver.balance += Number(amount);

        await sender.save({ session });
        await receiver.save({ session });

        // Create transaction record
        const newTx = new Transaction({
            sender: sender._id,
            senderName: sender.fullName,
            receiver: receiver._id,
            receiverName: receiver.fullName,
            receiverAccountNumber: receiver.accountNumber,
            amount: Number(amount),
            description: description || "Transfer to " + receiver.fullName,
            type: 'transfer',
            status: 'success',
            senderBalance: sender.balance,
            receiverBalance: receiver.balance,
            transactionId: "TXN-" + crypto.randomBytes(3).toString('hex').toUpperCase()
        });

        await newTx.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({
            success: true,
            message: "Amount transfer successfully!",
            newBalance: sender.balance,
            transactionDetail: newTx
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("Transfer error:", error);
        res.status(500).json({ success: false, message: "System error: " + error.message });
    }
});

// --- DEPOSIT API ---
router.post('/deposit', verifyToken, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { amount } = req.body;
        const userId = req.user?.id || req.id;
        const user = await User.findById(userId).session(session);
        if (!user) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const depositVal = Number(amount);
        const tId = `DEP${Date.now()}${Math.floor(Math.random() * 1000)}`;

        user.balance = (Number(user.balance) || 0) + depositVal;

        const transaction = new Transaction({
            sender: userId,
            senderName: "Digital Wallet",
            receiver: userId,
            receiverName: user.fullName,
            amount: depositVal,
            type: 'deposit',
            status: 'success',
            description: 'Wallet Added',
            receiverBalance: user.balance,
            transactionId: tId
        });

        await transaction.save({ session });
        await user.save({ session });

        await session.commitTransaction();
        session.endSession();

        return res.status(200).json({
            success: true,
            message: `Rs. ${depositVal.toLocaleString()} added to your wallet!`,
            newBalance: user.balance
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("Deposit error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET: /api/transactions/history
router.get('/history', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // Check karein ke userId mil rahi hai ya nahi
        if (!userId) {
            return res.status(401).json({ success: false, message: "User not authorized" });
        }

        const history = await Transaction.find({
            $or: [
                { sender: userId },
                { receiver: userId }
            ]
        })
            .populate('sender', 'fullName profilePic') // Optional: Sender ki mazeed details ke liye
            .populate('receiver', 'fullName profilePic') // Optional: Receiver ki mazeed details ke liye
            .sort({ createdAt: -1 });

        // Response ko hamesha check karein
        res.status(200).json({
            success: true,
            count: history.length,
            history: history
        });

    } catch (err) {
        console.error("History Error:", err.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

// 2. Delete Single Transaction (User Side)
router.delete('/delete/:id', verifyToken, async (req, res) => {
    try {
        const tx = await Transaction.findById(req.params.id);
        if (!tx) return res.status(404).json({ message: "Transaction not found" });

        // Security: Check karein ke ye transaction isi user ki hai
        if (tx.sender.toString() !== req.user.id && tx.receiver.toString() !== req.user.id) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        await Transaction.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Transaction deleted from history" });
    } catch (err) {
        res.status(500).json({ message: "Delete failed" });
    }
});

module.exports = router;