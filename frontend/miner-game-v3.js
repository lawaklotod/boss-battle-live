// Minecraft Auto Miner - Gravity Based
const socket = io('https://gembos-backend.onrender.com');

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Config
const BLOCK_SIZE = 64;
const COLS = 6;
const GRAVITY = 0.6;
const BOUNCE_DAMPENING = 0.3;

// Game state
let gameState = {
  depth: 0,
  score: 0,
  blocks: [],
  player: {
    x: 0,
    y: 0,
    velocityY: 0,
    width: 48,
    height: 60,
    col: 2
  },
  bombs: [],
  pickaxe: 'WOOD',
  diamonds: 0,
  combo: 1.0,
  cameraY: 0
};

// Block types
const BLOCK_TYPES = {
  AIR: { color: 'transparent', strength: 0, score: 0, name: 'AIR', solid: false },
  DIRT: { color: '#8B4513', strength: 2, score: 1, name: 'DIRT', solid: true },
  STONE: { color: '#808080', strength: 3, score: 2, name: 'STONE', solid: true },
  COAL: { color: '#1a1a1a', strength: 3, score: 5, name: 'COAL', solid: true },
  IRON: { color: '#C0C0C0', strength: 4, score: 10, name: 'IRON', solid: true },
  GOLD: { color: '#FFD700', strength: 4, score: 20, name: 'GOLD', solid: true },
  DIAMOND: { color: '#00D9FF', strength: 5, score: 50, name: 'DIAMOND', solid: true },
  NETHERITE: { color: '#8B008B', strength: 6, score: 100, name: 'NETHERITE', solid: true },
  BEDROCK: { color: '#2C2C2C', strength: 999, score: 0, name: 'BEDROCK', solid: true }
};

// Resize canvas
function resizeCanvas() {
  const maxWidth = 600;
  canvas.width = Math.min(window.innerWidth, maxWidth);
  canvas.height = window.innerHeight;
}

// Generate block
function generateBlock(row, col) {
  if (row < 3) return { type: 'AIR', hp: 0, maxHp: 0, row, col };
  if (row >= 150) return { type: 'BEDROCK', hp: 999, maxHp: 999, row, col };
  
  const random = Math.random();
  let type = 'DIRT';
  
  if (row < 10) {
    type = random < 0.7 ? 'DIRT' : 'STONE';
  } else if (row < 25) {
    if (random < 0.5) type = 'STONE';
    else if (random < 0.8) type = 'DIRT';
    else type = 'COAL';
  } else if (row < 50) {
    if (random < 0.4) type = 'STONE';
    else if (random < 0.65) type = 'COAL';
    else if (random < 0.85) type = 'IRON';
    else type = 'GOLD';
  } else if (row < 100) {
    if (random < 0.3) type = 'STONE';
    else if (random < 0.5) type = 'IRON';
    else if (random < 0.7) type = 'GOLD';
    else if (random < 0.9) type = 'DIAMOND';
    else type = 'NETHERITE';
  } else {
    if (random < 0.2) type = 'STONE';
    else if (random < 0.4) type = 'IRON';
    else if (random < 0.6) type = 'GOLD';
    else if (random < 0.8) type = 'DIAMOND';
    else if (random < 0.95) type = 'NETHERITE';
    else type = 'BEDROCK';
  }
  
  const blockData = BLOCK_TYPES[type];
  return {
    type: type,
    hp: blockData.strength,
    maxHp: blockData.strength,
    row: row,
    col: col,
    x: col * BLOCK_SIZE,
    y: row * BLOCK_SIZE
  };
}

// Initialize
function initGame() {
  resizeCanvas();
  gameState.blocks = [];
  
  for (let row = 0; row < 200; row++) {
    for (let col = 0; col < COLS; col++) {
      gameState.blocks.push(generateBlock(row, col));
    }
  }
  
  // Player start position
  gameState.player.col = 2;
  gameState.player.x = gameState.player.col * BLOCK_SIZE + (BLOCK_SIZE - gameState.player.width) / 2;
  gameState.player.y = BLOCK_SIZE * 2;
  
  gameLoop();
}

// Get block at position
function getBlock(row, col) {
  return gameState.blocks.find(b => b.row === row && b.col === col);
}

// Get blocks player is overlapping
function getOverlappingBlocks() {
  const player = gameState.player;
  const blocks = [];
  
  const startCol = Math.floor((player.x) / BLOCK_SIZE);
  const endCol = Math.floor((player.x + player.width) / BLOCK_SIZE);
  const startRow = Math.floor((player.y) / BLOCK_SIZE);
  const endRow = Math.floor((player.y + player.height) / BLOCK_SIZE);
  
  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      const block = getBlock(row, col);
      if (block && BLOCK_TYPES[block.type].solid) {
        blocks.push(block);
      }
    }
  }
  
  return blocks;
}

// Apply gravity & physics
function updatePlayer() {
  const player = gameState.player;
  
  // Apply gravity
  player.velocityY += GRAVITY;
  player.velocityY = Math.min(player.velocityY, 15); // Terminal velocity
  
  // Move player
  player.y += player.velocityY;
  
  // Check collision with blocks
  const overlapping = getOverlappingBlocks();
  
  if (overlapping.length > 0) {
    // Mine blocks automatically
    overlapping.forEach(block => {
      if (block.type !== 'BEDROCK') {
        damageBlock(block);
      }
    });
    
    // If still solid after mining, bounce/stop
    const stillSolid = overlapping.filter(b => BLOCK_TYPES[b.type].solid);
    if (stillSolid.length > 0) {
      // Player hit solid block - bounce up slightly
      if (player.velocityY > 0) {
        const bounceBlock = stillSolid[0];
        player.y = bounceBlock.y - player.height - 1;
        player.velocityY = -player.velocityY * 0.3; // Small bounce
        
        // If bounce too small, stop
        if (Math.abs(player.velocityY) < 1) {
          player.velocityY = 0;
        }
      }
    }
  }
  
  // Update depth
  gameState.depth = Math.floor(player.y / BLOCK_SIZE);
  
  // Camera follow player
  gameState.cameraY = player.y - canvas.height / 3;
}

// Damage block (auto-mining)
function damageBlock(block) {
  if (block.lastHit && Date.now() - block.lastHit < 100) return; // Cooldown
  block.lastHit = Date.now();
  
  block.hp -= 1;
  
  if (block.hp <= 0) {
    // Block destroyed
    const blockData = BLOCK_TYPES[block.type];
    const points = Math.floor(blockData.score * gameState.combo);
    
    gameState.score += points;
    gameState.combo = Math.min(gameState.combo + 0.05, 3.0);
    
    if (block.type === 'DIAMOND') gameState.diamonds++;
    
    // Convert to AIR
    block.type = 'AIR';
    block.hp = 0;
    block.maxHp = 0;
    
    // Visual effects
    const screenY = block.y - gameState.cameraY;
    showEffect(block.x + BLOCK_SIZE/2, screenY + BLOCK_SIZE/2, `+${points}`);
    createParticles(block.x + BLOCK_SIZE/2, screenY + BLOCK_SIZE/2, blockData.color);
    
    // Send to backend
    socket.emit('blockMined', {
      username: 'Miner',
      blockType: blockData.name,
      points: points,
      depth: gameState.depth
    });
  }
}

// Spawn bomb
function spawnBomb() {
  const bomb = {
    x: Math.random() * (canvas.width - 40) + 20,
    y: -50,
    velocityY: 0,
    radius: 20,
    bounces: 0,
    exploded: false
  };
  
  gameState.bombs.push(bomb);
  addChatMessage('💣 BOMB INCOMING!');
}

// Update bombs
function updateBombs() {
  gameState.bombs.forEach((bomb, index) => {
    if (bomb.exploded) return;
    
    // Apply gravity
    bomb.velocityY += GRAVITY;
    bomb.y += bomb.velocityY;
    
    // World position
    const worldY = bomb.y + gameState.cameraY;
    const row = Math.floor(worldY / BLOCK_SIZE);
    const col = Math.floor(bomb.x / BLOCK_SIZE);
    
    // Check collision with blocks
    const block = getBlock(row, col);
    if (block && BLOCK_TYPES[block.type].solid) {
      if (bomb.bounces < 2) {
        // Bounce
        bomb.velocityY = -bomb.velocityY * BOUNCE_DAMPENING;
        bomb.y = (row * BLOCK_SIZE - gameState.cameraY) - bomb.radius - 5;
        bomb.bounces++;
      } else {
        // Explode
        explodeBomb(row, col);
        bomb.exploded = true;
        gameState.bombs.splice(index, 1);
      }
    }
    
    // Remove if too far down
    if (bomb.y > canvas.height + 100) {
      gameState.bombs.splice(index, 1);
    }
  });
}

// Bomb explosion
function explodeBomb(centerRow, centerCol) {
  let totalPoints = 0;
  
  for (let r = centerRow - 1; r <= centerRow + 1; r++) {
    for (let c = centerCol - 1; c <= centerCol + 1; c++) {
      const block = getBlock(r, c);
      if (block && block.type !== 'BEDROCK' && block.type !== 'AIR') {
        const blockData = BLOCK_TYPES[block.type];
        totalPoints += blockData.score * 2;
        
        block.type = 'AIR';
        block.hp = 0;
      }
    }
  }
  
  gameState.score += totalPoints;
  
  // Explosion effect
  const screenX = centerCol * BLOCK_SIZE + BLOCK_SIZE/2;
  const screenY = centerRow * BLOCK_SIZE - gameState.cameraY + BLOCK_SIZE/2;
  showEffect(screenX, screenY, '💥 BOOM!', 'netherite');
  
  addChatMessage(`💥 EXPLOSION! +${totalPoints} points!`);
}

// Draw block
function drawBlock(block) {
  const blockData = BLOCK_TYPES[block.type];
  if (!blockData.solid) return;
  
  const x = block.x;
  const y = block.y - gameState.cameraY;
  
  if (y < -BLOCK_SIZE || y > canvas.height + BLOCK_SIZE) return;
  
  ctx.fillStyle = blockData.color;
  ctx.fillRect(x, y, BLOCK_SIZE, BLOCK_SIZE);
  
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, BLOCK_SIZE, BLOCK_SIZE);
  
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.fillRect(x, y, BLOCK_SIZE, BLOCK_SIZE / 4);
  
  // Cracks
  if (block.hp < block.maxHp && block.hp > 0) {
    const crackLevel = Math.floor((1 - block.hp / block.maxHp) * 3);
    ctx.strokeStyle = `rgba(255,0,0,${0.3 + crackLevel * 0.2})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 10, y + 10);
    ctx.lineTo(x + BLOCK_SIZE - 10, y + BLOCK_SIZE - 10);
    ctx.moveTo(x + BLOCK_SIZE - 10, y + 10);
    ctx.lineTo(x + 10, y + BLOCK_SIZE - 10);
    ctx.stroke();
  }
  
  // Icons
  const icons = {
    COAL: '⚫', IRON: '⚪', GOLD: '🟡',
    DIAMOND: '💎', NETHERITE: '🟣', BEDROCK: '⬛'
  };
  
  if (icons[block.type]) {
    ctx.font = `${BLOCK_SIZE * 0.5}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icons[block.type], x + BLOCK_SIZE/2, y + BLOCK_SIZE/2);
  }
}

// Draw player
function drawPlayer() {
  const player = gameState.player;
  const x = player.x + player.width/2;
  const y = player.y + player.height/2 - gameState.cameraY;
  
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.arc(x + 2, y + player.height/2 + 2, player.width/3, 0, Math.PI * 2);
  ctx.fill();
  
  // Player head
  ctx.fillStyle = '#D2A679';
  ctx.fillRect(x - 20, y - 25, 40, 40);
  
  // Face
  ctx.fillStyle = '#000';
  ctx.fillRect(x - 12, y - 18, 8, 8);
  ctx.fillRect(x + 4, y - 18, 8, 8);
  ctx.fillRect(x - 8, y - 2, 16, 4);
  
  // Body
  ctx.fillStyle = '#4A9EFF';
  ctx.fillRect(x - 15, y + 15, 30, 25);
  
  // Pickaxe (rotating)
  ctx.save();
  ctx.translate(x + 25, y);
  ctx.rotate(Math.sin(Date.now() / 200) * 0.3);
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(-5, -20, 10, 25);
  ctx.fillStyle = '#808080';
  ctx.fillRect(-10, -25, 20, 8);
  ctx.restore();
}

// Draw bombs
function drawBombs() {
  gameState.bombs.forEach(bomb => {
    if (bomb.exploded) return;
    
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.arc(bomb.x + 2, bomb.y + 2, bomb.radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Bomb
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(bomb.x, bomb.y, bomb.radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Fuse
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(bomb.x, bomb.y - bomb.radius);
    ctx.lineTo(bomb.x - 5, bomb.y - bomb.radius - 10);
    ctx.stroke();
    
    // Spark
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(bomb.x - 5, bomb.y - bomb.radius - 10, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Emoji
    ctx.font = '30px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('💣', bomb.x, bomb.y);
  });
}

// Update & draw
function update() {
  updatePlayer();
  updateBombs();
  
  document.getElementById('depthValue').textContent = gameState.depth;
  document.getElementById('scoreValue').textContent = gameState.score.toLocaleString();
  document.getElementById('pickaxePower').textContent = gameState.pickaxe;
  document.getElementById('diamondCount').textContent = gameState.diamonds;
  document.getElementById('comboMultiplier').textContent = gameState.combo.toFixed(1);
}

function draw() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#87CEEB');
  gradient.addColorStop(0.5, '#4A90E2');
  gradient.addColorStop(1, '#1a1a1a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  gameState.blocks.forEach(block => drawBlock(block));
  drawBombs();
  drawPlayer();
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// Effects
function showEffect(x, y, text, type) {
  const effect = document.createElement('div');
  effect.className = 'click-effect';
  if (type) effect.classList.add(type);
  effect.textContent = text;
  effect.style.left = x + 'px';
  effect.style.top = y + 'px';
  document.getElementById('clickEffects').appendChild(effect);
  setTimeout(() => effect.remove(), 1000);
}

function createParticles(x, y, color) {
  for (let i = 0; i < 6; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = x + 'px';
    particle.style.top = y + 'px';
    particle.style.backgroundColor = color;
    const angle = (Math.PI * 2 * i) / 6;
    const dist = 40 + Math.random() * 30;
    particle.style.setProperty('--tx', Math.cos(angle) * dist + 'px');
    particle.style.setProperty('--ty', Math.sin(angle) * dist + 'px');
    document.getElementById('clickEffects').appendChild(particle);
    setTimeout(() => particle.remove(), 800);
  }
}

function addChatMessage(msg) {
  const chat = document.getElementById('chatOverlay');
  const div = document.createElement('div');
  div.className = 'chat-message';
  div.innerHTML = msg;
  chat.appendChild(div);
  while (chat.children.length > 8) chat.removeChild(chat.firstChild);
}

// Socket
socket.on('connect', () => {
  addChatMessage('✅ Connected!');
  addChatMessage('💬 Type "bomb" in chat!');
});

socket.on('blockMined', data => {
  addChatMessage(`<span class="username">${data.username}:</span> ${data.blockType}!`);
});

socket.on('chatMessage', data => {
  addChatMessage(`<span class="username">${data.username}:</span> ${data.message}`);
  if (data.message.toLowerCase().includes('bomb')) {
    spawnBomb();
  }
});

window.addEventListener('resize', resizeCanvas);

initGame();
addChatMessage('🎮 Auto Miner Started!');
addChatMessage('⛏️ Pickaxe mines automatically!');
