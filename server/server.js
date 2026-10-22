const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const path = require('path');
const storage = require('./storage');

const MAX_PAYLOAD = 5 * 1024 * 1024;
const MONTH_NOTE_KEY = /^\d{4}-\d{1,2}$/;

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  maxHttpBufferSize: MAX_PAYLOAD,
});

app.use(cors());
app.use(express.json({ limit: MAX_PAYLOAD }));

// Serve static files from src directory
// (also under /group, since the page at /group/:id loads its assets by relative paths)
app.use(express.static(path.join(__dirname, '../src')));
app.use('/group', express.static(path.join(__dirname, '../src')));

function validGroup(req, res, next) {
  if (!storage.isValidGroupId(req.params.groupId)) {
    return res.status(400).json({ error: 'Invalid group id' });
  }
  next();
}

// Get all data for a group
app.get('/api/groups/:groupId', validGroup, (req, res) => {
  res.json(storage.getGroup(req.params.groupId));
});

// Get tasks for a group
app.get('/api/groups/:groupId/tasks', validGroup, (req, res) => {
  res.json({ tasks: storage.getGroup(req.params.groupId).tasks });
});

// Update tasks for a group
app.post('/api/groups/:groupId/tasks', validGroup, (req, res) => {
  const { groupId } = req.params;
  const { tasks } = req.body;

  if (!Array.isArray(tasks)) {
    return res.status(400).json({ error: 'tasks must be an array' });
  }

  storage.setTasks(groupId, tasks);

  // Broadcast to all clients in this group
  io.to(`group-${groupId}`).emit('tasks-updated', { tasks });

  res.json({ success: true, tasks });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Join a group room
  socket.on('join-group', (groupId) => {
    if (!storage.isValidGroupId(groupId)) return;

    socket.join(`group-${groupId}`);
    console.log(`Client ${socket.id} joined group ${groupId}`);

    // Send current data to the newly joined client
    const { tasks, monthNotes } = storage.getGroup(groupId);
    socket.emit('tasks-updated', { tasks });
    socket.emit('month-notes-updated', { monthNotes });
  });

  // Handle task updates from clients
  socket.on('update-tasks', ({ groupId, tasks } = {}) => {
    if (!storage.isValidGroupId(groupId) || !Array.isArray(tasks)) return;

    storage.setTasks(groupId, tasks);

    // Broadcast to all clients in this group (including sender)
    io.to(`group-${groupId}`).emit('tasks-updated', { tasks });
  });

  // Month notes are updated one at a time so that concurrent edits
  // of different months don't overwrite each other
  socket.on('update-month-note', ({ groupId, key, value } = {}) => {
    if (!storage.isValidGroupId(groupId) || !MONTH_NOTE_KEY.test(key) || typeof value !== 'string') return;

    storage.setMonthNote(groupId, key, value);

    // Sender already has the value, notify only the others
    const { monthNotes } = storage.getGroup(groupId);
    socket.to(`group-${groupId}`).emit('month-notes-updated', { monthNotes });
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

function shutdown() {
  storage.flushAll();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Data directory: ${storage.DATA_DIR}`);
});
