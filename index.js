const express = require("express");
const dotenv = require("dotenv");
dotenv.config();

const app = express();

const cors = require("cors");

app.use(cors({
    origin: ["https://bank-app-fe.vercel.app", "http://localhost:5173", "http://localhost:3000"],
    credentials: true
}));

app.use(express.json());

const { connectDB } = require("./config/db");

connectDB();

const authControl = require("./routes/authControl");
app.use("/api/auth", authControl);

const transactionRoute = require("./routes/transaction");
app.use("/api/transactions", transactionRoute);

const userRoute = require("./routes/user");
app.use("/api/user", userRoute);

const adminDashboardRoute = require("./routes/adminDashboard");
app.use("/api/admin", adminDashboardRoute);

const cardRoute = require("./routes/card");
app.use("/api/card", cardRoute);

app.get("/", (req, res) => {
    res.send("Backend is running successfully");
});

// Public Rates API
app.get("/api/rates", (req, res) => {
    res.json([
        { _id: '1', type: 'Saving Account', rate: '12.5%', period: 'Per Annum' },
        { _id: '2', type: 'Current Account', rate: '0.0%', period: 'N/A' },
    ]);
});

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = app;