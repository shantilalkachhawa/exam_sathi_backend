// socket.js
module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('🔌 A user connected: ' + socket.id);

    // Example: Joining a room
    socket.on('join room', (roomId) => {
      socket.join(roomId);
      console.log(`User ${socket.id} joined room: ${roomId}`);
      socket.to(roomId).emit('user joined', socket.id);
    });

    // Example: Sending message to a specific room
    socket.on('chat message', ({ roomId, message }) => {
      console.log(`Message to room ${roomId}: ${message}`);
      io.to(roomId).emit('chat message', { message, sender: socket.id });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('❌ User disconnected: ' + socket.id);
    });
  });
};
