const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const GameState = require('./gameLogic');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const game = new GameState();
const userCooldowns = new Map();
const COOLDOWN_MS = 500;

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.emit('gameState', game.getState());
  
  socket.on('attack', (data) => {
    const { username } = data;
    
    if (!username) {
      socket.emit('error', { message: 'Username required' });
      return;
    }
    
    const now = Date.now();
    const lastAttack = userCooldowns.get(username) || 0;
    
    if (now - lastAttack < COOLDOWN_MS) {
      socket.emit('error', { 
        message: 'Cooldown active',
        remainingMs: COOLDOWN_MS - (now - lastAttack)
      });
      return;
    }
    
    const result = game.processAttack(username);
    
    if (result.success) {
      userCooldowns.set(username, now);
      
      io.emit('attackResult', {
        username,
        ...result
      });
      
      if (result.bossDefeated) {
        setTimeout(() => {
          io.emit('bossDefeated', {
            attackers: game.attackers
          });
        }, 500);
      }
    } else {
      socket.emit('error', result);
    }
  });
  
  socket.on('resetBoss', () => {
    game.reset();
    io.emit('gameState', game.getState());
    io.emit('bossReset');
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', game: game.getState() });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});