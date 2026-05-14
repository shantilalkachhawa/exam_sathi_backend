const express = require('express');
const cors = require('cors')
const app = express();
require('dotenv').config(); // Load .env

// Create HTTP server
const http = require('http');
const server = http.createServer(app);

// Attach Socket.IO to HTTP server
const socketIo = require('socket.io');
const io = socketIo(server);


app.use(cors());

// DB connection
const sequelize = require('./config/db');

// --- Socket.IO Logic ---
require('./controllers/socket')(io);

// --- Express Middleware ---
app.use(express.json()); // Parse JSON

// --- API Routes ---
const usersRoute = require('./routes/users');
const productsRoute = require('./routes/products');
const categoryRoute = require('./routes/category');
const cartRoute = require('./routes/cart');
const orderRoute = require('./routes/orders');
const storeRoute = require('./routes/store');
const deliveryRoute = require('./routes/delivery');

app.use('/api/products', productsRoute);
app.use('/api/categories', categoryRoute);
app.use('/api/cart', cartRoute);
app.use('/api/order', orderRoute);
app.use("/api/stores", storeRoute);
app.use("/api/delivery-boys", deliveryRoute);

// app.use('/api/payment', paymentRoute);
app.use('/api', usersRoute);

// --- Razorpay Config ---
// sequelize.sync({ alter: true })
//   .then(() => console.log('✅ All tables created successfully!'))
//   .catch(err => console.error('❌ Error creating tables:', err));


// --- Start Server (Express + Socket.IO) ---
const port = process.env.PORT || 4000;
server.listen(port, () => {
  console.log(`Server (API + Socket.IO) is running on port ${port}`);
});
