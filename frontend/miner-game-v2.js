// Minecraft Downward Digger - Manual Mining
const socket = io('https://gembos-backend.onrender.com');

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Config
const BLOCK_SIZE = 64;
const COLS = 6;
const ROWS = 20; // Static world, no auto-scroll

// Game state
let gameState = {
  depth: 0,
  score: 0,
  blocks: [],
  player: {
    col: 2,
    row: 0,
    y: 0,
    falling: false,
    velocity: 0
  },
  pickaxe: 'WOOD',
  diamonds: 0,
  combo: 1.0,
  bombs: 0
};

// Block types
const BLOCK_TYPES = {
  AIR: { 
    color: 'transparent', 
    strength: 0, 
    score: 0,
    name: 'AIR',
    solid: false
  },
  DIRT: { 
    color: '#8B4513', 
    strength: 2, 
    score: 1,
    name: 'DIRT',
    solid: true
  },
  STONE: { 
    color: '#808080', 
    strength: 3, 
    score: 2,
    name: 'STONE',
    solid: true
  },
  COAL: { 
    color: '#1a1a1a', 
    strength: 3, 
    score: 5,
    name: 'COAL',
    solid: true
  },
  IRON: { 
    color: '#C0C0C0', 
    strength: 4, 
    score: 10,
    name: 'IRON',
    solid: true
  },
  GOLD: { 
    color: '#FFD700', 
    strength: 4, 
    score: 20,
    name: 'GOLD',
    solid: true
  },
  DIAMOND: { 
    color: '#00D9FF', 
    strength: 5, 
    score: 50,
    name: 'DIAMOND',
    solid: true
  },
  NETHERITE: { 
    color: '#8B008B', 
    strength: 6, 
    score: 100,
    name: 'NETHERITE',
    solid: true
  },
  BEDROCK: { 
    color: '#2C2C2C', 
    strength: 999, 
    score: 0,
    name: 'BEDROCK',
    solid: true
  }
};

// Resize canvas
function resizeCanvas() {
  const maxWidth = 600;
  canvas.width = Math.min(window.innerWidth, maxWidth);
  canvas.height = window.innerHeight;
}

// Generate block based on depth
function generateBlock(row, col) {
  // First row is always AIR for player spawn
  if (row === 0) return { type: 'AIR', hp: 0, maxHp: 0, row, col };
  
  // Bedrock at bottom
  if (row >= 100) return { type: 'BEDROCK', hp: 999, maxHp: 999, row, col };
  
  const random = Math.random();
  let type = 'DIRT';
  
  if (row < 5) {
    type = random < 0.8 ? 'DIRT' : 'STONE';
  } else if (row < 15) {
    if (random < 0.6) type = 'DIRT';
    else if (random < 0.85) type = 'STONE';
    else type = 'COAL';
  } else if (row < 30) {
    if (random < 0.5) type = 'STONE';
    else if (random < 0.7) type = 'COAL';
    else if (random < 0.9) type = 'IRON';
    else type = 'GOLD';
  } else if (row < 50) {
    if (random < 0.4) type = 'STONE';
    else if (random < 0.6) type = 'IRON';
    else if (random < 0.8) type = 'GOLD';
    else if (random < 0.95) type = 'DIAMOND';
    else type = 'NETHERITE';
  } else {
    if (random < 0.3) type = 'STONE';
    else if (random < 0.5) type = 'IRON';
    else if (random < 0.7) type = 'GOLD';
    else if (random < 0.88) type = 'DIAMOND';
    else if (random < 0.97) type = 'NETHERITE';
    else type = 'BEDROCK';
  }
  
  const blockData = BLOCK_TYPES[type];
  return {
    type: type,
    hp: blockData.strength,
    maxHp: blockData.strength,
    row: row,
    col: col
  };
}

// Initialize game world
function initGame() {
  resizeCanvas();
  gameState.blocks = [];
  
  // Generate world
  for (let row = 0; row < 120; row++) {
    for (let col = 0; col < COLS; col++) {
      gameState.blocks.push(generateBlock(row, col));
    }
  }
  
  // Set player starting position
  gameState.player.col = 2;
  gameState.player.row = 0;
  gameState.player.y = 0;
  
  gameLoop();
}

// Get block at position
function getBlock(row, col) {
  return gameState.blocks.find(b => b.row === row && b.col === col);
}

// Set block type
function setBlock(row, col, type) {
  const block = getBlock(row, col);
  if (block) {
    block.type = type;
    block.hp = 0;
    block.maxHp = 0;
  }
}

// Check if block is solid
function isSolid(row, col) {
  const block = getBlock(row, col);
  return block && BLOCK_TYPES[block.type].solid;
}

// Apply gravity to player
function applyGravity() {
  if (gameState.player.falling) {
    gameState.player.velocity += 0.5; // Gravity acceleration
    gameState.player.y += gameState.player.velocity;
    
    // Check collision with ground
    const nextRow = Math.floor(gameState.player.y / BLOCK_SIZE);
    if (isSolid(nextRow + 1, gameState.player.col)) {
      // Land on block
      gameState.player.row = nextRow;
      gameState.player.y = nextRow * BLOCK_SIZE;
      gameState.player.falling = false;
      gameState.player.velocity = 0;
    }
  } else {
    // Check if should start falling
    if (!isSolid(gameState.player.row + 1, gameState.player.col)) {
      gameState.player.falling = true;
      gameState.player.velocity = 0;
    }
  }
}

// Camera offset (follow player)
function getCameraOffset() {
  const targetY = gameState.player.y - canvas.height / 3;
  return Math.max(0, targetY);
}

// Draw block
function drawBlock(block, cameraOffset) {
  const blockData = BLOCK_TYPES[block.type];
  if (!blockData.solid) return; // Don't draw AIR
  
  const x = block.col * BLOCK_SIZE;
  const y = block.row * BLOCK_SIZE - cameraOffset;
  
  if (y < -BLOCK_SIZE || y > canvas.height + BLOCK_SIZE) return;
  
  // Draw block
  ctx.fillStyle = blockData.color;
  ctx.fillRect(x, y, BLOCK_SIZE, BLOCK_SIZE);
  
  // Border
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, BLOCK_SIZE, BLOCK_SIZE);
  
  // Highlight
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.fillRect(x, y, BLOCK_SIZE, BLOCK_SIZE / 4);
  
  // Crack effect
  if (block.hp < block.maxHp && block.hp > 0) {
    const crackLevel = Math.floor((1 - block.hp / block.maxHp) * 3);
    ctx.strokeStyle = `rgba(255,0,0,${0.3 + crackLevel * 0.2})`;
    ctx.lineWidth = 4;
    
    // Draw X crack
    ctx.beginPath();
    ctx.moveTo(x + 10, y + 10);
    ctx.lineTo(x + BLOCK_SIZE - 10, y + BLOCK_SIZE - 10);
    ctx.moveTo(x + BLOCK_SIZE - 10, y + 10);
    ctx.lineTo(x + 10, y + BLOCK_SIZE - 10);
    ctx.stroke();
  }
  
  // Draw icon/emoji
  const icons = {
    COAL: '⚫',
    IRON: '⚪',
    GOLD: '🟡',
    DIAMOND: '💎',
    NETHERITE: '🟣',
    BEDROCK: '⬛'
  };
  
  if (icons[block.type]) {
    ctx.font = `${BLOCK_SIZE * 0.5}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icons[block.type], x + BLOCK_SIZE / 2, y + BLOCK_SIZE / 2);
  }
}

// Draw player
function drawPlayer(cameraOffset) {
  const x = gameState.player.col * BLOCK_SIZE + BLOCK_SIZE / 2;
  const y = gameState.player.y + BLOCK_SIZE / 2 - cameraOffset;
  
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.arc(x + 3, y + BLOCK_SIZE / 2 + 3, BLOCK_SIZE / 3, 0, Math.PI * 2);
  ctx.fill();
  
  // Player (Steve head)
  ctx.fillStyle = '#D2A679';
  ctx.fillRect(x - 20, y - 20, 40, 40);
  
  // Face
  ctx.fillStyle = '#000';
  ctx.fillRect(x - 12, y - 10, 8, 8); // Left eye
  ctx.fillRect(x + 4, y - 10, 8, 8);  // Right eye
  ctx.fillRect(x - 8, y + 5, 16, 4);  // Mouth
  
  // Pickaxe
  ctx.save();
  ctx.translate(x + 25, y);
  ctx.rotate(gameState.player.falling ? 0.3 : -0.3);
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(-5, -25, 10, 30); // Handle
  ctx.fillStyle = '#808080';
  ctx.fillRect(-12, -30, 24, 10); // Head
  ctx.restore();
}

// Update game
function update() {
  applyGravity();
  
  // Update depth
  gameState.depth = gameState.player.row;
  
  // Update UI
  document.getElementById('depthValue').textContent = gameState.depth;
  document.getElementById('scoreValue').textContent = gameState.score.toLocaleString();
  document.getElementById('pickaxePower').textContent = gameState.pickaxe;
  document.getElementById('diamondCount').textContent = gameState.diamonds;
  document.getElementById('comboMultiplier').textContent = gameState.combo.toFixed(1);
}

// Draw game
function draw() {
  const cameraOffset = getCameraOffset();
  
  // Clear canvas
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#87CEEB');
  gradient.addColorStop(0.5, '#4A90E2');
  gradient.addColorStop(1, '#1a1a1a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw blocks
  gameState.blocks.forEach(block => drawBlock(block, cameraOffset));
  
  // Draw player
  drawPlayer(cameraOffset);
}

// Game loop
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// Handle click/tap on block
function handleClick(event) {
  event.preventDefault();
  
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  
  const x = (event.clientX || event.touches[0].clientX) - rect.left;
  const y = (event.clientY || event.touches[0].clientY) - rect.top;
  
  const canvasX = x * scaleX;
  const canvasY = y * scaleY;
  
  const cameraOffset = getCameraOffset();
  const worldY = canvasY + cameraOffset;
  
  const col = Math.floor(canvasX / BLOCK_SIZE);
  const row = Math.floor(worldY / BLOCK_SIZE);
  
  // Find clicked block
  const block = getBlock(row, col);
  
  // Can only mine adjacent blocks
  const playerRow = gameState.player.row;
  const playerCol = gameState.player.col;
  
  const isAdjacent = 
    (Math.abs(row - playerRow) <= 1 && col === playerCol) ||
    (row === playerRow && Math.abs(col - playerCol) === 1);
  
  if (block && isAdjacent && block.type !== 'BEDROCK' && block.type !== 'AIR') {
    mineBlock(block, canvasX, canvasY - cameraOffset);
  }
}

// Mine block (2 hits to break)
function mineBlock(block, screenX, screenY) {
  block.hp -= 1;
  
  // Show hit effect
  showClickEffect(screenX, screenY, '⛏️', null);
  
  if (block.hp <= 0) {
    // Block destroyed
    const blockData = BLOCK_TYPES[block.type];
    const points = Math.floor(blockData.score * gameState.combo);
    
    gameState.score += points;
    gameState.combo = Math.min(gameState.combo + 0.1, 3.0);
    
    if (block.type === 'DIAMOND') gameState.diamonds++;
    
    // Convert to AIR
    block.type = 'AIR';
    block.hp = 0;
    block.maxHp = 0;
    
    // Show points
    showClickEffect(screenX, screenY, `+${points}`, block.type);
    createParticles(screenX, screenY, blockData.color);
    
    // Send to backend
    socket.emit('blockMined', {
      username: 'Player_' + Math.floor(Math.random() * 1000),
      blockType: blockData.name,
      points: points,
      depth: gameState.depth
    });
    
    addChatMessage(`Player mined ${blockData.name}! +${points}`);
  }
}

// Bomb explosion (3x3 area)
function explodeBomb(centerRow, centerCol) {
  gameState.bombs--;
  
  for (let r = centerRow - 1; r <= centerRow + 1; r++) {
    for (let c = centerCol - 1; c <= centerCol + 1; c++) {
      const block = getBlock(r, c);
      if (block && block.type !== 'BEDROCK' && block.type !== 'AIR') {
        const blockData = BLOCK_TYPES[block.type];
        const points = Math.floor(blockData.score * 2); // Bomb gives 2x points
        
        gameState.score += points;
        
        block.type = 'AIR';
        block.hp = 0;
        block.maxHp = 0;
      }
    }
  }
  
  // Big explosion effect
  const x = centerCol * BLOCK_SIZE + BLOCK_SIZE / 2;
  const y = centerRow * BLOCK_SIZE + BLOCK_SIZE / 2 - getCameraOffset();
  showClickEffect(x, y, '💥 BOMB!', 'NETHERITE');
  
  addChatMessage('💣 BOMB EXPLODED! 💥');
}

// Show effect
function showClickEffect(x, y, text, blockType) {
  const effect = document.createElement('div');
  effect.className = 'click-effect';
  if (blockType === 'DIAMOND' || blockType === 'NETHERITE') {
    effect.classList.add(blockType.toLowerCase());
  }
  effect.textContent = text;
  effect.style.left = x + 'px';
  effect.style.top = y + 'px';
  
  document.getElementById('clickEffects').appendChild(effect);
  setTimeout(() => effect.remove(), 1000);
}

// Particles
function createParticles(x, y, color) {
  for (let i = 0; i < 6; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = x + 'px';
    particle.style.top = y + 'px';
    particle.style.backgroundColor = color;
    
    const angle = (Math.PI * 2 * i) / 6;
    const distance = 40 + Math.random() * 40;
    particle.style.setProperty('--tx', Math.cos(angle) * distance + 'px');
    particle.style.setProperty('--ty', Math.sin(angle) * distance + 'px');
    
    document.getElementById('clickEffects').appendChild(particle);
    setTimeout(() => particle.remove(), 800);
  }
}

// Chat
function addChatMessage(message) {
  const chatOverlay = document.getElementById('chatOverlay');
  const chatMsg = document.createElement('div');
  chatMsg.className = 'chat-message';
  chatMsg.innerHTML = message;
  
  chatOverlay.appendChild(chatMsg);
  while (chatOverlay.children.length > 8) {
    chatOverlay.removeChild(chatOverlay.firstChild);
  }
}

// Socket events
socket.on('connect', () => {
  console.log('Connected');
  addChatMessage('✅ Connected! Type "bomb" to get bombs!');
});

socket.on('blockMined', (data) => {
  addChatMessage(`<span class="username">${data.username}:</span> Mined ${data.blockType}!`);
});

socket.on('chatMessage', (data) => {
  addChatMessage(`<span class="username">${data.username}:</span> ${data.message}`);
  
  // Check for bomb command
  if (data.message.toLowerCase().includes('bomb')) {
    gameState.bombs++;
    addChatMessage('💣 +1 BOMB! Tap near player to use!');
    
    // Use bomb at player position
    setTimeout(() => {
      if (gameState.bombs > 0) {
        explodeBomb(gameState.player.row + 1, gameState.player.col);
      }
    }, 500);
  }
});

// Events
canvas.addEventListener('click', handleClick);
canvas.addEventListener('touchstart', handleClick);
window.addEventListener('resize', resizeCanvas);

// Start
initGame();
addChatMessage('🎮 Minecraft Downward Digger!');
addChatMessage('⛏️ Tap blocks 2x to break!');
