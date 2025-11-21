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
    methods: ["GET", "POST"],
    credentials: true
  }
});

const game = new GameState();
const userCooldowns = new Map();
const COOLDOWN_MS = 500;

// ============================================
// HTTP ROUTES
// ============================================

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    name: 'Boss Battle Backend API',
    status: 'running',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      socket: 'wss://gembos-backend.onrender.com',
      docs: 'Connect via Socket.IO client'
    },
    game: {
      bossName: game.boss.name,
      bossHP: `${game.boss.currentHP}/${game.boss.maxHP}`,
      isAlive: game.boss.isAlive,
      activeAttackers: game.attackers.length
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    game: game.getState(),
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage(),
    connections: io.engine.clientsCount
  });
});

// Stats endpoint
app.get('/stats', (req, res) => {
  res.json({
    boss: {
      name: game.boss.name,
      currentHP: game.boss.currentHP,
      maxHP: game.boss.maxHP,
      hpPercent: Math.round((game.boss.currentHP / game.boss.maxHP) * 100),
      isAlive: game.boss.isAlive
    },
    combo: {
      current: game.combo.count,
      multiplier: game.combo.multiplier
    },
    stats: {
      totalAttackers: game.attackers.length,
      recentAttackers: game.attackers.slice(-10),
      connectedClients: io.engine.clientsCount
    }
  });
});

// ============================================
// SOCKET.IO HANDLERS
// ============================================

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Send current game state on connect
  socket.emit('gameState', game.getState());
  
  // Handle attack
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
      
      // Broadcast attack result to all clients
      io.emit('attackResult', {
        username,
        ...result
      });
      
      console.log(`${username} attacked for ${result.damage} damage (Combo: ${result.combo})`);
      
      // Check if boss defeated
      if (result.bossDefeated) {
        setTimeout(() => {
          io.emit('bossDefeated', {
            attackers: game.attackers,
            totalAttacks: game.attackers.length,
            bossName: game.boss.name
          });
          console.log('Boss defeated! Total attackers:', game.attackers.length);
        }, 500);
      }
    } else {
      socket.emit('error', result);
    }
  });
  
  // Handle boss reset
  socket.on('resetBoss', () => {
    console.log('Boss reset requested by:', socket.id);
    game.reset();
    io.emit('gameState', game.getState());
    io.emit('bossReset');
    
    // Clear cooldowns
    userCooldowns.clear();
    
    console.log('Boss reset completed');
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
  
  // Handle errors
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// ============================================
// SERVER START
// ============================================

const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Boss: ${game.boss.name} (${game.boss.maxHP} HP)`);
  console.log('Ready to accept connections!');
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// ============================================
// ERROR HANDLERS
// ============================================

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});