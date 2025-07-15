// Aoom/server/server.js

const express = require('express');
const http = require('http');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { Server } = require('socket.io');
const User = require('./user'); // Import user model

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ✅ Connect to MongoDB (local)
mongoose.connect('mongodb://127.0.0.1:27017/aoom', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch((err) => console.error('❌ MongoDB connection failed:', err));

// 🔧 Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

// 📥 Register Route
app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).send('⚠️ Username already exists');

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();

    res.status(200).send('✅ Registered successfully!');
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).send('❌ Server error during registration');
  }
});

// 🔐 Login Route
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(401).send('❌ Invalid username');

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).send('❌ Incorrect password');

    res.status(200).send('✅ Login successful!');
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).send('❌ Server error during login');
  }
});

// 🧠 Socket.io basic connection
io.on('connection', (socket) => {
  console.log('🟢 New socket connected:', socket.id);

  socket.on('message', (msg) => {
    socket.broadcast.emit('createMessage', msg);
  });

  socket.on('disconnect', () => {
    console.log('🔴 Socket disconnected:', socket.id);
  });
});

// ✅ Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
