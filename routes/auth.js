const express = require("express");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();

// SIGNUP
router.post("/signup", async (req, res) => {
    const { email, password } = req.body;

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ msg: "Email already exists" });

    const hashed = await bcrypt.hash(password, 10);

    const user = new User({ email, password: hashed, name: email.split("@")[0] });
    await user.save();

    res.json({ msg: "Signup successful" });
});

// LOGIN
router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: "User not found" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ msg: "Wrong password" });

    // <<< FIX: sign payload with `user: { id }` so middleware can read decoded.user
    const token = jwt.sign({ user: { id: user._id } }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.json({
        token,
        email: user.email,
        name: user.name
    });
});

// Get logged-in user info
router.get("/me", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");
        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: "Server error" });
    }
});

module.exports = router;
