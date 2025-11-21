// Minecraft Infinite Miner - Game Logic
// Connect to backend
const socket = io('https://gembos-backend.onrender.com');

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game config
const BLOCK_SIZE = 64;
const COLS = 6;
let ROWS = 0;

// Game state
let gameState = {
  depth: 0,
  score: 0,
  blocks: [],
  scrollOffset: 0,
  scrollSpeed: 1.5,
  pickaxe: 'WOOD',
  diamonds: 0,
  combo: 1.0,
  totalBlocksMined: 0
};

// Block types with Minecraft colors
const BLOCK_TYPES = {
  DIRT: { 
    color: '#8B4513', 
    strength: 1, 
    score: 1,
    name: 'DIRT',
    texture: '🟫'
  },
  STONE: { 
    color: '#808080', 
    strength: 2, 
    score: 2,
    name: 'STONE',
    texture: '⬜'
  },
  COAL: { 
    color: '#1a1a1a', 
    strength: 2, 
    score: 5,
    name: 'COAL',
    texture: '⬛'
  },
  IRON: { 
    color: '#C0C0C0', 
    strength: 3, 
    score: 10,
    name: 'IRON',
    texture: '🔲'
  },
  GOLD: { 
    color: '#FFD700', 
    strength: 3, 
    score: 20,
    name: 'GOLD',
    texture: '🟨'
  },
  DIAMOND: { 
    color: '#00D9FF', 
    strength: 4, 
    score: 50,
    name: 'DIAMOND',
    texture: '💎'
  },
  NETHERITE: { 
    color: '#8B008B', 
    strength: 5, 
    score: 100,
    name: 'NETHERITE',
    texture: '🟪'
  },
  BEDROCK: { 
    color: '#2C2C2C', 
    strength: 999, 
    score: 0,
    name: 'BEDROCK',
    texture: '⬛'
  }
};

// Resize canvas
function resizeCanvas() {
  const maxWidth = 600;
  const width = Math.min(window.innerWidth, maxWidth);
  canvas.width = width;
  canvas.height = window.innerHeight;
  ROWS = Math.ceil(canvas.height / BLOCK_SIZE) + 2;
}

// Generate block based on depth
function generateBlock(row, col) {
  const depth = Math.floor((row * BLOCK_SIZE + gameState.scrollOffset) / BLOCK_SIZE);
  const random = Math.random();
  
  let type = 'DIRT';
  
  if (depth < 5) {
    type = random < 0.7 ? 'DIRT' : 'STONE';
  } else if (depth < 15) {
    if (random < 0.5) type = 'STONE';
    else if (random < 0.8) type = 'DIRT';
    else type = 'COAL';
  } else if (depth < 30) {
    if (random < 0.6) type = 'STONE';
    else if (random < 0.75) type = 'COAL';
    else if (random < 0.9) type = 'IRON';
    else type = 'GOLD';
  } else if (depth < 50) {
    if (random < 0.5) type = 'STONE';
    else if (random < 0.7) type = 'IRON';
    else if (random < 0.85) type = 'GOLD';
    else if (random < 0.95) type = 'DIAMOND';
    else type = 'NETHERITE';
  } else {
    if (random < 0.4) type = 'STONE';
    else if (random < 0.6) type = 'IRON';
    else if (random < 0.75) type = 'GOLD';
    else if (random < 0.88) type = 'DIAMOND';
    else if (random < 0.97) type = 'NETHERITE';
    else type = 'BEDROCK';
  }
  
  return {
    type: type,
    hp: BLOCK_TYPES[type].strength,
    maxHp: BLOCK_TYPES[type].strength,
    row: row,
    col: col,
    cracked: 0
  };
}

// Initialize game
function initGame() {
  resizeCanvas();
  gameState.blocks = [];
  
  for (let row = 0; row < ROWS + 5; row++) {
    for (let col = 0; col < COLS; col++) {
      gameState.blocks.push(generateBlock(row, col));
    }
  }
  
  gameLoop();
}

// Draw block
function drawBlock(block) {
  const blockData = BLOCK_TYPES[block.type];
  const x = block.col * BLOCK_SIZE;
  const y = block.row * BLOCK_SIZE - gameState.scrollOffset;
  
  if (y < -BLOCK_SIZE || y > canvas.height) return;
  
  // Draw block
  ctx.fillStyle = blockData.color;
  ctx.fillRect(x, y, BLOCK_SIZE, BLOCK_SIZE);
  
  // Draw border
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, BLOCK_SIZE, BLOCK_SIZE);
  
  // Draw highlight
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.fillRect(x, y, BLOCK_SIZE, BLOCK_SIZE / 4);
  
  // Draw crack effect if damaged
  if (block.hp < block.maxHp) {
    const crackLevel = Math.floor((1 - block.hp / block.maxHp) * 5);
    ctx.strokeStyle = `rgba(0,0,0,${0.3 + crackLevel * 0.1})`;
    ctx.lineWidth = 3;
    
    for (let i = 0; i < crackLevel; i++) {
      ctx.beginPath();
      ctx.moveTo(x + Math.random() * BLOCK_SIZE, y + Math.random() * BLOCK_SIZE);
      ctx.lineTo(x + Math.random() * BLOCK_SIZE, y + Math.random() * BLOCK_SIZE);
      ctx.stroke();
    }
  }
  
  // Draw texture emoji
  ctx.font = `${BLOCK_SIZE * 0.5}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillText(blockData.texture, x + BLOCK_SIZE / 2, y + BLOCK_SIZE / 2);
}

// Draw player (pickaxe at bottom)
function drawPlayer() {
  const centerX = canvas.width / 2;
  const bottomY = canvas.height - 80;
  
  // Draw Steve/player
  ctx.font = '60px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillText('🧑‍🔧', centerX + 3, bottomY + 3);
  
  // Player
  ctx.fillStyle = '#FFF';
  ctx.fillText('🧑‍🔧', centerX, bottomY);
  
  // Pickaxe indicator
  const pickaxeEmoji = {
    'WOOD': '🪓',
    'STONE': '⛏️',
    'IRON': '⚒️',
    'DIAMOND': '💎',
    'NETHERITE': '🔱'
  }[gameState.pickaxe] || '⛏️';
  
  ctx.font = '40px Arial';
  ctx.fillText(pickaxeEmoji, centerX - 50, bottomY);
}

// Update game
function update() {
  // Auto scroll down
  gameState.scrollOffset += gameState.scrollSpeed;
  gameState.depth = Math.floor(gameState.scrollOffset / BLOCK_SIZE);
  
  // Generate new blocks at bottom
  const maxRow = Math.max(...gameState.blocks.map(b => b.row));
  if (maxRow * BLOCK_SIZE - gameState.scrollOffset < canvas.height + BLOCK_SIZE * 2) {
    for (let col = 0; col < COLS; col++) {
      gameState.blocks.push(generateBlock(maxRow + 1, col));
    }
  }
  
  // Remove blocks that scrolled off top
  gameState.blocks = gameState.blocks.filter(b => {
    const y = b.row * BLOCK_SIZE - gameState.scrollOffset;
    return y > -BLOCK_SIZE * 2;
  });
  
  // Increase difficulty
  if (gameState.depth % 20 === 0 && gameState.scrollSpeed < 3) {
    gameState.scrollSpeed += 0.1;
  }
  
  // Update UI
  document.getElementById('depthValue').textContent = gameState.depth;
  document.getElementById('scoreValue').textContent = gameState.score.toLocaleString();
  document.getElementById('pickaxePower').textContent = gameState.pickaxe;
  document.getElementById('diamondCount').textContent = gameState.diamonds;
  document.getElementById('comboMultiplier').textContent = gameState.combo.toFixed(1);
}

// Draw game
function draw() {
  // Clear canvas with gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#87CEEB');
  gradient.addColorStop(0.3, '#4A90E2');
  gradient.addColorStop(0.7, '#2C3E50');
  gradient.addColorStop(1, '#1a1a1a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw blocks
  gameState.blocks.forEach(block => drawBlock(block));
  
  // Draw player
  drawPlayer();
}

// Game loop
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// Handle click/tap
function handleClick(event) {
  event.preventDefault();
  
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  
  const x = (event.clientX || event.touches[0].clientX) - rect.left;
  const y = (event.clientY || event.touches[0].clientY) - rect.top;
  
  const canvasX = x * scaleX;
  const canvasY = y * scaleY;
  
  const col = Math.floor(canvasX / BLOCK_SIZE);
  const adjustedY = canvasY + gameState.scrollOffset;
  const row = Math.floor(adjustedY / BLOCK_SIZE);
  
  // Find clicked block
  const block = gameState.blocks.find(b => b.col === col && b.row === row);
  
  if (block && block.type !== 'BEDROCK') {
    mineBlock(block, canvasX, canvasY);
  }
}

// Mine block
function mineBlock(block, x, y) {
  block.hp -= 1;
  
  if (block.hp <= 0) {
    // Block destroyed
    const blockData = BLOCK_TYPES[block.type];
    const points = Math.floor(blockData.score * gameState.combo);
    
    gameState.score += points;
    gameState.totalBlocksMined++;
    
    // Update combo
    gameState.combo = Math.min(gameState.combo + 0.1, 5.0);
    
    // Track diamonds
    if (block.type === 'DIAMOND') {
      gameState.diamonds++;
    }
    
    // Upgrade pickaxe
    if (gameState.totalBlocksMined === 50) gameState.pickaxe = 'STONE';
    if (gameState.totalBlocksMined === 150) gameState.pickaxe = 'IRON';
    if (gameState.diamonds >= 10) gameState.pickaxe = 'DIAMOND';
    if (gameState.diamonds >= 30) gameState.pickaxe = 'NETHERITE';
    
    // Show points
    showClickEffect(x, y, `+${points}`, block.type);
    
    // Create particles
    createParticles(x, y, blockData.color);
    
    // Remove block from array
    gameState.blocks = gameState.blocks.filter(b => b !== block);
    
    // Send to backend
    socket.emit('blockMined', {
      username: 'Player_' + Math.floor(Math.random() * 1000),
      blockType: block.type,
      points: points,
      depth: gameState.depth
    });
    
    // Add chat message
    addChatMessage(`Player mined ${blockData.name}!`);
  } else {
    // Show damage
    showClickEffect(x, y, '-1', null);
  }
}

// Show click effect
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

// Create particles
function createParticles(x, y, color) {
  for (let i = 0; i < 8; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = x + 'px';
    particle.style.top = y + 'px';
    particle.style.backgroundColor = color;
    
    const angle = (Math.PI * 2 * i) / 8;
    const distance = 50 + Math.random() * 50;
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance;
    
    particle.style.setProperty('--tx', tx + 'px');
    particle.style.setProperty('--ty', ty + 'px');
    
    document.getElementById('clickEffects').appendChild(particle);
    
    setTimeout(() => particle.remove(), 800);
  }
}

// Add chat message
function addChatMessage(message) {
  const chatOverlay = document.getElementById('chatOverlay');
  const chatMsg = document.createElement('div');
  chatMsg.className = 'chat-message';
  chatMsg.innerHTML = `<span class="username">Anonymous:</span> ${message}`;
  
  chatOverlay.appendChild(chatMsg);
  
  // Keep only last 10 messages
  while (chatOverlay.children.length > 10) {
    chatOverlay.removeChild(chatOverlay.firstChild);
  }
  
  chatOverlay.scrollTop = chatOverlay.scrollHeight;
}

// Socket events
socket.on('connect', () => {
  console.log('Connected to server');
  addChatMessage('Connected to game server! 🎮');
});

socket.on('blockMined', (data) => {
  addChatMessage(`${data.username} mined <span class="block-name">${data.blockType}</span>! +${data.points}`);
});

// Event listeners
canvas.addEventListener('click', handleClick);
canvas.addEventListener('touchstart', handleClick);

window.addEventListener('resize', resizeCanvas);

// Start game
initGame();
addChatMessage('Welcome to Minecraft Infinite Miner! 🎮⛏️');
addChatMessage('Tap blocks to mine them!');
