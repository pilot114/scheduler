const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Serve static files from src directory
app.use(express.static(path.join(__dirname, '../src')));

// In-memory storage for group tasks
// Structure: { groupId: { tasks: [...] } }
const groupData = {};

// Get tasks for a group
app.get('/api/groups/:groupId/tasks', (req, res) => {
  const { groupId } = req.params;

  if (!groupData[groupId]) {
    groupData[groupId] = { tasks: [] };
  }

  res.json({ tasks: groupData[groupId].tasks });
});

// Update tasks for a group
app.post('/api/groups/:groupId/tasks', (req, res) => {
  const { groupId } = req.params;
  const { tasks } = req.body;

  if (!groupData[groupId]) {
    groupData[groupId] = { tasks: [] };
  }

  groupData[groupId].tasks = tasks;

  // Broadcast to all clients in this group
  io.to(`group-${groupId}`).emit('tasks-updated', { tasks });

  res.json({ success: true, tasks });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Join a group room
  socket.on('join-group', (groupId) => {
    socket.join(`group-${groupId}`);
    console.log(`Client ${socket.id} joined group ${groupId}`);

    // Send current tasks to the newly joined client
    if (!groupData[groupId]) {
      groupData[groupId] = { tasks: [] };
    }
    socket.emit('tasks-updated', { tasks: groupData[groupId].tasks });
  });

  // Handle task updates from clients
  socket.on('update-tasks', ({ groupId, tasks }) => {
    if (!groupData[groupId]) {
      groupData[groupId] = { tasks: [] };
    }

    groupData[groupId].tasks = tasks;

    // Broadcast to all clients in this group (including sender)
    io.to(`group-${groupId}`).emit('tasks-updated', { tasks });
  });

  // Leave group
  socket.on('leave-group', (groupId) => {
    socket.leave(`group-${groupId}`);
    console.log(`Client ${socket.id} left group ${groupId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Serve index.html for group URLs
app.get('/group/:groupId', (req, res) => {
  res.sendFile(path.join(__dirname, '../src/index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
