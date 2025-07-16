const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const rooms = {}; // { roomId: password }

app.use(express.static(path.join(__dirname, '../client')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.get('/room', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/room.html'));
});

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('join-room', ({ room, password }) => {
    if (!rooms[room]) {
      rooms[room] = password;
      socket.join(room);
      socket.room = room;
      socket.to(room).emit('user-joined');
    } else {
      if (rooms[room] === password) {
        socket.join(room);
        socket.room = room;
        socket.to(room).emit('user-joined');
      } else {
        socket.emit('wrong-password');
      }
    }
  });

  socket.on('offer', (offer) => {
    socket.to(socket.room).emit('offer', offer);
  });

  socket.on('answer', (answer) => {
    socket.to(socket.room).emit('answer', answer);
  });

  socket.on('ice-candidate', (candidate) => {
    socket.to(socket.room).emit('ice-candidate', candidate);
  });

  socket.on('message', (msg) => {
    socket.to(socket.room).emit('createMessage', msg);
  });

  socket.on('file', (data) => {
    socket.to(socket.room).emit('file', data);
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
