const pixelGen = new PixelCharacterGenerator();
const socket = io('http://localhost:3000');

let gameStartTime = Date.now();
let totalAttacks = 0;
let lastAttackTime = 0;
let isAttacking = false;

// Elements
const bossHPBar = document.getElementById('bossHPBar');
const bossHPGhost = document.getElementById('bossHPGhost');
const bossCurrentHP = document.getElementById('bossCurrentHP');
const bossMaxHP = document.getElementById('bossMaxHP');
const bossName = document.getElementById('bossName');
const bossSprite = document.getElementById('bossSprite');
const heroSprite = document.getElementById('heroSprite');
const comboCount = document.getElementById('comboCount');
const comboMultiplier = document.getElementById('comboMultiplier');
const damageNumbers = document.getElementById('damageNumbers');
const particleContainer = document.getElementById('particleContainer');
const victoryScreen = document.getElementById('victoryScreen');
const boss = document.getElementById('boss');
const hero = document.getElementById('hero');
const attackTrail = document.getElementById('attackTrail');
const chatOverlay = document.getElementById('chatOverlay');
const viewerCount = document.getElementById('viewerCount');

// Initialize
window.addEventListener('load', () => {
  console.log('Mobile game loading...');
  
  // Generate sprites
  try {
    const heroImage = pixelGen.generateHero(128);
    heroSprite.src = heroImage;
    
    const bossImage = pixelGen.generateSlimeBoss(256);
    bossSprite.src = bossImage;
    
    const groundImage = pixelGen.generateGrassPlatform(2000, 80);
    document.getElementById('groundTexture').src = groundImage;
    
    console.log('✅ All sprites generated');
    
    // Clear initial chat
    chatOverlay.innerHTML = '';
    
    // Simulate viewer count fluctuation
    setInterval(() => {
      const current = parseInt(viewerCount.textContent);
      const change = Math.floor(Math.random() * 10) - 4;
      const newCount = Math.max(100, current + change);
      viewerCount.textContent = newCount;
    }, 5000);
    
  } catch (e) {
    console.error('Error generating sprites:', e);
    bossName.textContent = 'ERROR: ' + e.message;
  }
});

// Socket handlers
socket.on('connect', () => {
  console.log('Connected to server');
  addChatMessage('System', 'Connected!', false);
});

socket.on('gameState', (state) => {
  updateGameState(state);
});

socket.on('attackResult', (result) => {
  handleAttackResult(result);
});

socket.on('bossDefeated', (data) => {
  showVictoryScreen(data);
});

socket.on('bossReset', () => {
  hideVictoryScreen();
  gameStartTime = Date.now();
  totalAttacks = 0;
});

// Update game state
function updateGameState(state) {
  const hpPercent = (state.boss.currentHP / state.boss.maxHP) * 100;
  bossHPBar.style.width = hpPercent + '%';
  bossHPGhost.style.width = hpPercent + '%';
  bossCurrentHP.textContent = state.boss.currentHP;
  bossMaxHP.textContent = state.boss.maxHP;
  
  comboCount.textContent = state.combo.count;
  comboMultiplier.textContent = `×${state.combo.multiplier.toFixed(1)}`;
}

// Handle attack result
function handleAttackResult(result) {
  totalAttacks++;
  
  // Update HP
  const hpPercent = (result.bossHP / result.bossMaxHP) * 100;
  bossHPBar.style.width = hpPercent + '%';
  
  setTimeout(() => {
    bossHPGhost.style.width = hpPercent + '%';
  }, 300);
  
  bossCurrentHP.textContent = result.bossHP;
  
  // Update combo
  const comboEl = document.getElementById('comboCount');
  comboEl.textContent = result.combo;
  comboEl.classList.add('bump');
  setTimeout(() => comboEl.classList.remove('bump'), 300);
  
  comboMultiplier.textContent = `×${result.comboMultiplier.toFixed(1)}`;
  
  // Visual effects
  const isCritical = result.comboMultiplier >= 1.5;
  showDamageNumber(result.damage, isCritical);
  bossHitAnimation();
  heroAttackAnimation();
  createImpactParticles(isCritical);
  
  // Sound effects
  if (isCritical) {
    mcSounds.playCritical();
  } else {
    mcSounds.playHit();
  }
  
  if (result.combo % 10 === 0 && result.combo > 0) {
    mcSounds.playXP();
  }
  
  // Add to chat
  addChatMessage(result.username, `${result.damage}`, isCritical);
}

// Show damage number
function showDamageNumber(damage, isCritical = false) {
  const damageEl = document.createElement('div');
  damageEl.className = 'damage-number' + (isCritical ? ' critical' : '');
  damageEl.textContent = damage;
  
  const bossRect = boss.getBoundingClientRect();
  const randomX = bossRect.left + bossRect.width/2 + (Math.random() * 150 - 75);
  const randomY = bossRect.top + bossRect.height/2;
  
  damageEl.style.left = randomX + 'px';
  damageEl.style.top = randomY + 'px';
  
  damageNumbers.appendChild(damageEl);
  
  setTimeout(() => {
    damageEl.remove();
  }, 1000);
}

// Boss hit animation
function bossHitAnimation() {
  boss.classList.add('hit');
  setTimeout(() => {
    boss.classList.remove('hit');
  }, 300);
}

// Hero attack animation
function heroAttackAnimation() {
  hero.classList.add('attacking');
  attackTrail.classList.add('active');
  
  setTimeout(() => {
    hero.classList.remove('attacking');
    attackTrail.classList.remove('active');
  }, 400);
}

// Create impact particles
function createImpactParticles(isCritical = false) {
  const particleCount = isCritical ? 30 : 15;
  const bossRect = boss.getBoundingClientRect();
  const centerX = bossRect.left + bossRect.width / 2;
  const centerY = bossRect.top + bossRect.height / 2;
  
  const colors = ['#7ED957', '#5FA838', '#4A7C2F'];
  
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('img');
    particle.className = 'particle minecraft-block';
    
    const color = colors[Math.floor(Math.random() * colors.length)];
    particle.src = pixelGen.generateBlockParticle(color, 20);
    
    const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.4;
    const velocity = 100 + Math.random() * 150;
    let vx = Math.cos(angle) * velocity;
    let vy = Math.sin(angle) * velocity - 60;
    
    particle.style.position = 'absolute';
    particle.style.left = centerX + 'px';
    particle.style.top = centerY + 'px';
    particle.style.zIndex = '50';
    
    particleContainer.appendChild(particle);
    
    let x = 0, y = 0;
    let opacity = 1;
    const gravity = 4;
    let rotation = Math.random() * 360;
    const rotationSpeed = (Math.random() - 0.5) * 25;
    
    const animate = () => {
      x += vx * 0.016;
      vy += gravity;
      y += vy * 0.016;
      rotation += rotationSpeed;
      opacity -= 0.012;
      
      particle.style.transform = `translate(${x}px, ${y}px) rotate(${rotation}deg)`;
      particle.style.opacity = opacity;
      
      if (opacity > 0 && y < 800) {
        requestAnimationFrame(animate);
      } else {
        particle.remove();
      }
    };
    
    requestAnimationFrame(animate);
  }
}

// Add chat message
function addChatMessage(username, message, isCritical = false) {
  const chatEl = document.createElement('div');
  chatEl.className = 'chat-message';
  
  const content = `${username} ⚔️ ${message}`;
  const critBadge = isCritical ? ' <span class="crit">CRIT!</span>' : '';
  
  chatEl.innerHTML = content + critBadge;
  chatOverlay.appendChild(chatEl);
  
  // Keep only last 5 messages
  while (chatOverlay.children.length > 5) {
    chatOverlay.removeChild(chatOverlay.firstChild);
  }
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    if (chatEl.parentElement) {
      chatEl.style.opacity = '0';
      chatEl.style.transform = 'translateX(-50px)';
      setTimeout(() => chatEl.remove(), 300);
    }
  }, 5000);
}

// Victory screen
function showVictoryScreen(data) {
  const timeElapsed = Math.floor((Date.now() - gameStartTime) / 1000);
  const minutes = Math.floor(timeElapsed / 60);
  const seconds = timeElapsed % 60;
  
  document.getElementById('victoryTime').textContent = 
    `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  document.getElementById('victoryAttacks').textContent = totalAttacks;
  document.getElementById('victoryParticipants').textContent = data.attackers.length;
  
  const victoryBossIcon = document.getElementById('victoryBossIcon');
  victoryBossIcon.innerHTML = `<img src="${bossSprite.src}" style="width:100%;height:100%;filter:grayscale(1);">`;
  
  victoryScreen.style.display = 'flex';
  
  createConfetti();
}

function hideVictoryScreen() {
  victoryScreen.style.display = 'none';
}

function createConfetti() {
  for (let i = 0; i < 80; i++) {
    setTimeout(() => {
      const particle = document.createElement('div');
      particle.style.position = 'absolute';
      particle.style.width = '12px';
      particle.style.height = '12px';
      particle.style.background = ['#FFD93D', '#FFB627', '#FF6B3D', '#06FFA5', '#8A2BE2'][Math.floor(Math.random() * 5)];
      particle.style.left = Math.random() * 1080 + 'px';
      particle.style.top = '-30px';
      particle.style.pointerEvents = 'none';
      particle.style.borderRadius = '2px';
      
      particleContainer.appendChild(particle);
      
      let y = -30;
      let x = parseFloat(particle.style.left);
      const velocity = 3 + Math.random() * 5;
      const drift = (Math.random() - 0.5) * 4;
      let rotation = 0;
      const rotationSpeed = (Math.random() - 0.5) * 30;
      
      const fall = () => {
        y += velocity;
        x += drift;
        rotation += rotationSpeed;
        particle.style.top = y + 'px';
        particle.style.left = x + 'px';
        particle.style.transform = `rotate(${rotation}deg)`;
        
        if (y < 1920 + 50) {
          requestAnimationFrame(fall);
        } else {
          particle.remove();
        }
      };
      
      requestAnimationFrame(fall);
    }, i * 25);
  }
}

// Attack handler (touch + click)
function handleAttack(event) {
  event.preventDefault();
  
  // Cooldown check
  const now = Date.now();
  if (isAttacking || now - lastAttackTime < 500) {
    return;
  }
  
  isAttacking = true;
  lastAttackTime = now;
  
  // Send attack
  socket.emit('attack', { username: 'Mobile Player' });
  
  // Haptic feedback (if supported)
  if (navigator.vibrate) {
    navigator.vibrate(50);
  }
  
  // Reset cooldown
  setTimeout(() => {
    isAttacking = false;
  }, 500);
}

// Reset boss
function resetBoss() {
  socket.emit('resetBoss');
}

// Keyboard fallback for testing
document.addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.key === 'Spacebar') {
    e.preventDefault();
    handleAttack(e);
  }
});

// Add after other functions, before socket handlers

// Screen shake effect
function screenShake() {
  document.body.classList.add('shake');
  setTimeout(() => {
    document.body.classList.remove('shake');
  }, 400);
}

// Update combo milestone styling
function updateComboMilestone(combo) {
  const comboEl = document.querySelector('.combo-mobile');
  comboEl.classList.remove('milestone-25', 'milestone-50', 'milestone-100');
  
  if (combo >= 100) {
    comboEl.classList.add('milestone-100');
  } else if (combo >= 50) {
    comboEl.classList.add('milestone-50');
  } else if (combo >= 25) {
    comboEl.classList.add('milestone-25');
  }
}

console.log('🎮 Mobile game initialized');
