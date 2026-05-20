const express = require('express');
const router = express.Router();
const User = require('../models/user');
const { verifyToken } = require('../middlewares/auth');

// routes/card.js
// User side toggle freeze
router.patch('/toggle-freeze', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        user.cardDetails.isFrozen = !user.cardDetails.isFrozen;
        await user.save();
        
        res.json({ success: true, isFrozen: user.cardDetails.isFrozen, message: `Card is now ${user.cardDetails.isFrozen ? 'frozen' : 'active'}` });
    } catch (err) {
        console.error("Toggle freeze error:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

module.exports = router;