const express = require("express");
const router = express.Router();
const User = require("../models/user");
const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken');
const { verifyToken } = require('../middlewares/auth');


// routes/user.js
router.post("/submit-kyc", verifyToken, async (req, res) => {
    try {
        const { cnic, address, accountType, initialDeposit } = req.body;

        const updatedUser = await User.findByIdAndUpdate(req.user.id, {
            kycDetails: { cnic, address, accountType, initialDeposit },
            status: 'pending' // Ab user waiting list mein chala gaya
        }, { new: true });

        res.status(200).json({ success: true, user: updatedUser });
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
});


module.exports = router;
