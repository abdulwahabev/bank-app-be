const express = require("express");
const router = express.Router();
const User = require("../models/user");
const { verifyToken, isAdmin } = require('../middlewares/auth');
const Transaction = require('../models/transaction');
const SecuritySetting = require('../models/SecuritySetting');

// 1. Dashboard Stats API
router.get("/dashboard-stats", verifyToken, isAdmin, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({ role: { $ne: 'admin' } });

        // Total Liquidity (Sare users ka total balance)
        const result = await User.aggregate([
            { $match: { role: { $ne: 'admin' } } },
            { $group: { _id: null, total: { $sum: "$balance" } } }
        ]);
        const totalLiquidity = result.length > 0 ? result[0].total : 0;

        res.json({
            totalUsers: totalUsers.toLocaleString(),
            totalLiquidity: `Rs. ${(totalLiquidity / 1000000).toFixed(1)}M` // M mein convert karne ke liye
        });
    } catch (error) {
        res.status(500).json({ message: "Stats fetch failed" });
    }
});

// 1. Pending applications list
router.get("/pending-applications", verifyToken, isAdmin, async (req, res) => {
    try {
        const pendingUsers = await User.find({ status: 'pending' });
        res.status(200).json({ success: true, data: pendingUsers });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

// 2. Card Freeze/Unfreeze Logic
router.patch('/toggle-freeze/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User nahi mila" });

        user.cardDetails.isFrozen = !user.cardDetails.isFrozen;
        await user.save();

        res.json({ message: `Card ab ${user.cardDetails.isFrozen ? 'Frozen' : 'Active'} hai`, isFrozen: user.cardDetails.isFrozen });
    } catch (error) {
        res.status(500).json({ message: "Card status update fail ho gaya" });
    }
});

// 2. Fetch All Users for Management Table
router.get("/all-users", verifyToken, isAdmin, async (req, res) => {
    try {
        const users = await User.find({ role: { $ne: 'admin' } }).select("-password");
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: "Users fetch failed" });
    }
});

// 1. User ko Block/Unblock karna (Status Toggle)
router.patch('/toggle-status/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User nahi mila" });

        // Status toggle: agar active hai to blocked, warna active
        user.status = user.status === 'active' ? 'blocked' : 'active';
        await user.save();

        res.json({ message: `User ab ${user.status} hai`, status: user.status });
    } catch (error) {
        res.status(500).json({ message: "Status update fail ho gaya" });
    }
});

// 2. User ko Delete karna
router.delete('/delete-user/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: "User account permanently delete kar diya gaya" });
    } catch (error) {
        res.status(500).json({ message: "Delete karne mein masla aaya" });
    }
});



// Verification (KYC) status update karne ki API
router.patch('/verify-kyc/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        const { status } = req.body; // status can be 'active' or 'rejected'
        const userId = req.params.id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User nahi mila" });
        }

        if (status === 'active') {
            // Unique Account Number generate karein
            const accNo = "DB" + Math.floor(1000000000 + Math.random() * 9000000000);

            user.status = 'active';
            user.accountNumber = accNo;
            user.balance = user.kycDetails?.initialDeposit || 0;

            // Generate Card Details
            user.cardDetails.cardNumber = "4218" + Math.floor(100000000000 + Math.random() * 900000000000);
            user.cardDetails.cvv = Math.floor(100 + Math.random() * 900);
            user.cardDetails.isFrozen = false;
        } else {
            user.status = status;
        }

        await user.save();

        res.json({
            success: true,
            message: `User KYC ${status === 'active' ? 'Approve' : 'Reject'} kar diya gaya hai.`,
            user
        });
    } catch (error) {
        console.error("KYC Error:", error);
        res.status(500).json({ message: "Verification process mein error aaya" });
    }
});

// Admin Dashboard ke liye kisi specific user ki transactions
router.get('/user-transactions/:userId', verifyToken, isAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const transactions = await Transaction.find({
            $or: [
                { sender: userId },
                { receiver: userId }
            ]
        })
            .populate('sender', 'fullName accountNumber')
            .populate('receiver', 'fullName accountNumber')
            .sort({ createdAt: -1 });

        res.json(transactions);
    } catch (error) {
        res.status(500).json({ message: "Error fetching user transactions" });
    }
});

// 1. Security Settings ko Fetch karna
router.get('/get-security-settings', verifyToken, isAdmin, async (req, res) => {
    try {
        // Sabse pehle check karein setting exist karti hai ya nahi
        let setting = await SecuritySetting.findOne();

        // Agar koi setting nahi hai, to default values ke saath create karein
        if (!setting) {
            setting = await SecuritySetting.create({});
        }

        res.json(setting);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch security settings" });
    }
});

// 2. Security Settings ko Update Karna
router.post('/update-security-settings', verifyToken, isAdmin, async (req, res) => {
    try {
        const { maxDailyTransfer, perTransactionLimit, allowInternational } = req.body;

        // Sabse pehle setting ko find karein
        let setting = await SecuritySetting.findOne();

        if (!setting) {
            // Agar setting nahi hai, to naya create karein
            setting = await SecuritySetting.create({
                maxDailyTransfer,
                perTransactionLimit,
                allowInternational
            });
        } else {
            // Agar setting hai, to update karein
            setting.maxDailyTransfer = maxDailyTransfer;
            setting.perTransactionLimit = perTransactionLimit;
            setting.allowInternational = allowInternational;
            await setting.save();
        }

        res.json({ message: "Security settings updated successfully", setting });
    } catch (error) {
        res.status(500).json({ message: "Failed to update security settings" });
    }
});

// Admin Dashboard ke liye sari transactions
router.get("/all-transactions", verifyToken, isAdmin, async (req, res) => {
    try {
        const transactions = await Transaction.find()
            .populate('sender', 'fullName email')
            .populate('receiver', 'fullName email')
            .sort({ createdAt: -1 });
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ message: "Error fetching transactions" });
    }
});

module.exports = router;