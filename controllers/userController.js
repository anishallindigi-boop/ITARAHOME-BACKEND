const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { generateOTP, sendOtpToPhone } = require('../utils/otp'); // Updated import

// Register User
exports.register = async (req, res) => {
  try {
    const { name, email, phone,addresses } = req.body;
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const user = new User({ name, email, phone,addresses });
    await user.save();

    const { otp } = generateOTP();
   sendOtpToPhone(`91${phone}`, otp);
    user.otp = otp;
    await user.save();

    res.status(201).json({ message: 'User registered. OTP sent to phone.' });
  } catch (error) {
    console.log(error)
    res.status(500).json({ error: error.message });
  }
};

// Send OTP for Login (Phone-based)
exports.sendOTP = async (req, res) => {
  try {
    const { phone } = req.body;
    console.log(phone)
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

     const { otp } = generateOTP();
   sendOtpToPhone(`91${phone}`, otp);
    user.otp = otp;
    await user.save();

    res.json({ message: 'OTP sent to phone.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Verify OTP and Login
exports.verifyOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    console.log(phone, otp)
    const user = await User.findOne({ phone });
    if (!user || user.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    user.isVerified = true;
    user.otp = undefined; // Clear OTP
    await user.save();

        // Generate token
        const token = jwt.sign(
            { id: user.id, role: user.role }, 
            process.env.JWT_SECRET, 
            { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
        );

const isProduction = process.env.NODE_ENV === "production";
  return res
      .cookie("token", token, {
        httpOnly: true,
        path: "/",
        secure: isProduction,               // HTTPS only in prod
        sameSite: isProduction ? "none" : "lax",
        maxAge: 24 * 60 * 60 * 1000,         // 1 day
      })
      .status(200)
      .json({
        message: "Login successful",
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
        },
      });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get Profile (Protected)
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -otp');
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update Profile
exports.updateProfile = async (req, res) => {
  try {
    console.log(req.body); // you are getting: { name, email, phone, street, city, state, zipCode }

    const updates = { ...req.body };

    // Hash password if it exists
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 12);
    }

    // Map address fields correctly
    const addressFields = ["street", "city", "state", "zipCode"];
    const address = {};

    addressFields.forEach((field) => {
      if (updates[field]) {
        address[field] = updates[field];
        delete updates[field]; // remove from root
      }
    });

    if (Object.keys(address).length > 0) {
      updates.addresses = { 
        ...(updates.addresses || {}), 
        ...address 
      };
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true, runValidators: true } // <-- important to validate
    ).select("-password -otp");

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};




// ---------------- LOGOUT (NEW) ----------------
exports.logout = async (req, res) => {
  try {
    const isProduction = process.env.NODE_ENV === "production";

    res.clearCookie("token", {
      httpOnly: true,
      path: "/",
      secure: isProduction,                 // ✅ MATCH
      sameSite: isProduction ? "none" : "lax", // ✅ MATCH
    });

    res.status(200).json({ message: "Logout successful" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
