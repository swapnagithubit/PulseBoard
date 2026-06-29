const jwt = require("jsonwebtoken");
const User = require("../models/User");

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

const register = async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }
    
    // Default to Viewer if invalid or no role is provided
    const selectedRole = role === "Admin" ? "Admin" : "Viewer";
    
    const user = await User.create({
      name,
      email,
      password,
      role: selectedRole,
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMe = async (req, res) => {
  res.json({
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
  });
};

const seedUsers = async () => {
  try {
    const adminEmail = "admin@pulseboard.io";
    const adminExists = await User.findOne({ email: adminEmail });
    if (!adminExists) {
      await User.create({
        name: "Enterprise Admin",
        email: adminEmail,
        password: "admin123",
        role: "Admin",
      });
    }
    console.log(`✅ Seeded default admin user: ${adminEmail} (password: admin123)`);

    const viewerEmail = "viewer@pulseboard.io";
    const viewerExists = await User.findOne({ email: viewerEmail });
    if (!viewerExists) {
      await User.create({
        name: "Guest Viewer",
        email: viewerEmail,
        password: "viewer123",
        role: "Viewer",
      });
    }
    console.log(`✅ Seeded default viewer user: ${viewerEmail} (password: viewer123)`);
  } catch (error) {
    console.error("❌ Error seeding default users:", error.message);
  }
};

module.exports = { register, login, getMe, seedUsers };