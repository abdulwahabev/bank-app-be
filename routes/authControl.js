const express = require("express");
const router = express.Router();
const User = require("../models/user");
const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken');
const { verifyToken } = require('../middlewares/auth');

// 1. REGISTER API
router.post("/register", async (req, res) => {
    try {
        const { fullName, email, password, phone } = req.body;

        // 1. Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: "Email already registered" });

        // 2. Hash Password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 3. Create New User with Status 'incomplete'
        const newUser = new User({
            fullName,
            email,
            phone,
            password: hashedPassword,
            role: 'user',
            status: 'incomplete', // Shuruat mein incomplete
            balance: 0,
            accountNumber: null,
            // Empty objects initialize karein taake 500 error na aaye
            kycDetails: {
                cnic: "",
                address: "",
                accountType: "Saving",
                initialDeposit: 0
            },
            cardDetails: {
                cardNumber: null,
                cvv: null,
                isFrozen: false
            }
        });

        await newUser.save();
        res.status(201).json({ success: true, message: "User registered successfully!" });

    } catch (error) {
        console.error("Register Error:", error); // Terminal mein error dekhne ke liye
        res.status(500).json({ success: false, message: error.message });
    }
});

// 2. LOGIN API
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            return res.status(400).json({ message: "Invalid Email or Password", isError: true });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid Email or Password", isError: true });
        }

        // Token mein user ID store karein
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

        // Password hide karke baki data bhejein
        const userResponse = user.toObject();
        delete userResponse.password;

        res.status(200).json({
            success: true,
            message: "Login Successful",
            token,
            user: userResponse
        });
    } catch (error) {
        res.status(500).json({ message: "Server Error", isError: true });
    }
});

// 3. PROFILE API (Real-time Balance Fetching)
router.get('/profile', verifyToken, async (req, res) => {
    try {
        // Standardize: req.user.id (Depends on your verifyToken middleware)
        const userId = req.user?.id || req.id;

        const user = await User.findById(userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: "User not found", isError: true });
        }
        res.status(200).json({ success: true, user });
    } catch (error) {
        res.status(500).json({ message: "Fetch failed", isError: true });
    }
});

module.exports = router;