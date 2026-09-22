const { Server } = require('socket.io');

/**
 * SOCKET.IO INITIALIZATION & ROOM MANAGEMENT
 * ------------------------------------------
 * We run Socket.io directly on the Express HTTP server because our assumed scale 
 * (~50 concurrent front desk connections) doesn't require a separate message broker.
 * 
 * Logic flow:
      Front Desk client connects.
      Client emits 'join:office' with their officeId and the current date.
      We place them in a specific room (e.g., "office:123:2026-09-22").
      When the API processes an approval/registration, the service layer calls 
      getIo().to(room).emit('visit:updated', payload)`.
 * 
 * This ensures we never broadcast sensitive visitor info globally.
 */

let io;

/**
 * Attaches the Socket.io server to the existing HTTP server instance.
 * @param {import('http').Server} httpServer 
 */
function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 New client connected: ${socket.id}`);

    // Allow front desk clients to join their specific office's room for today's visits
    socket.on('join:office', ({ officeId, date }) => {
      if (!officeId || !date) return;
      
      const roomName = `office:${officeId}:${date}`;
      socket.join(roomName);
      console.log(`Client ${socket.id} joined room: ${roomName}`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });
}

/**
 * Getter to retrieve the io instance from anywhere in the app (e.g., controllers/services)
 * so we can emit events after database writes.
 */
function getIo() {
  if (!io) {
    throw new Error('Socket.io has not been initialized yet!');
  }
  return io;
}

module.exports = {
  initSocket,
  getIo
};
