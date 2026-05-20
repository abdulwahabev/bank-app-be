const mongoose = require('mongoose');

const SecuritySettingSchema = new mongoose.Schema({
    maxDailyTransfer: { type: Number, default: 250000 },
    perTransactionLimit: { type: Number, default: 50000 },
    allowInternational: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('SecuritySetting', SecuritySettingSchema);