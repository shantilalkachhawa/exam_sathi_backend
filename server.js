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

// DB connection + model associations
const { sequelize } = require('./models');

// --- Socket.IO Logic ---
require('./controllers/socket')(io);

// --- Express Middleware ---
app.use(express.json()); // Parse JSON


// --- API Routes ---
const usersRoute = require('./routes/users');
const questionsRoute = require('./routes/questions');
const roleRoutes = require("./routes/roleRoute");
const categoryRoutes = require("./routes/categoryRoutes");
const practiceTestRoutes = require("./routes/practiceTestRoutes");
const testAttemptRoutes = require("./routes/test-attempts");

app.use("/api/test-attempts", testAttemptRoutes);

app.use("/api/practice-test", practiceTestRoutes);

app.use("/api/categories", categoryRoutes);
app.use("/api/roles", roleRoutes);
app.use('/api/questions', questionsRoute);

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
