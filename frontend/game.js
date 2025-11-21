const pixelGen = new PixelCharacterGenerator();
const socket = io('http://localhost:3000');

let gameStartTime = Date.now();
let totalAttacks = 0;

const bossHPBar = document.getElementById('bossHPBar');
const bossHPGhost = document.getElementById('bossHPGhost');
const bossCurrentHP = document.getElementById('bossCurrentHP');
const bossMaxHP = document.getElementById('bossMaxHP');
const bossSprite = document.getElementById('bossSprite');
const heroSprite = document.getElementById('heroSprite');
const comboCount = document.getElementById('comboCount');
const comboMultiplier = document.getElementById('comboMultiplier');
const comboBarFill = document.getElementById('comboBarFill');
const damageNumbers = document.getElementById('damageNumbers');
const particleContainer = document.getElementById('particleContainer');
const victoryScreen = document.getElementById('victoryScreen');
const boss = document.getElementById('boss');
const hero = document.getElementById('hero');
const attackTrail = document.getElementById('attackTrail');
const chatLog = document.getElementById('chatLog');

window.addEventListener('load', () => {
  console.log('Loading characters...');
  
  const heroImage = pixelGen.generateHero(128);
  heroSprite.src = heroImage;
  console.log('Hero loaded:', heroImage.substring(0, 50));
  
  const bossImage = pixelGen.generateSlimeBoss(256);
  bossSprite.src = bossImage;
  console.log('Boss loaded:', bossImage.substring(0, 50));
  
  const groundImage = pixelGen.generateGrassPlatform(2000, 80);
  document.getElementById('groundTexture').src = groundImage;
  console.log('Ground loaded:', groundImage.substring(0, 50));
  
  addChatLog('⚔️ Battle system ready!');
});

socket.on('connect', () => {
  console.log('Connected to server');
  addChatLog('🔗 Connected to server');
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

function updateGameState(state) {
  const hpPercent = (state.boss.currentHP / state.boss.maxHP) * 100;
  bossHPBar.style.width = hpPercent + '%';
  bossHPGhost.style.width = hpPercent + '%';
  bossCurrentHP.textContent = state.boss.currentHP;
  bossMaxHP.textContent = state.boss.maxHP;
  
  comboCount.textContent = state.combo.count;
  comboMultiplier.textContent = `×${state.combo.multiplier.toFixed(1)}`;
  
  const comboPercent = Math.min(100, state.combo.count);
  comboBarFill.style.width = comboPercent + '%';
}

function handleAttackResult(result) {
  totalAttacks++;
  
  const hpPercent = (result.bossHP / result.bossMaxHP) * 100;
  bossHPBar.style.width = hpPercent + '%';
  
  setTimeout(() => {
    bossHPGhost.style.width = hpPercent + '%';
  }, 300);
  
  bossCurrentHP.textContent = result.bossHP;
  
  comboCount.textContent = result.combo;
  comboCount.classList.add('bump');
  setTimeout(() => comboCount.classList.remove('bump'), 300);
  
  comboMultiplier.textContent = `×${result.comboMultiplier.toFixed(1)}`;
  
  const comboPercent = Math.min(100, result.combo);
  comboBarFill.style.width = comboPercent + '%';
  
  const isCritical = result.comboMultiplier >= 1.5;
  showDamageNumber(result.damage, isCritical);
  bossHitAnimation();
  heroAttackAnimation();
  createImpactParticles(isCritical);
  
  if (isCritical) {
    mcSounds.playCritical();
  } else {
    mcSounds.playHit();
  }
  
  if (result.combo % 10 === 0 && result.combo > 0) {
    mcSounds.playXP();
  }
  
  addChatLog(`${result.username} ⚔️ ${result.damage}`);
}

function showDamageNumber(damage, isCritical = false) {
  const damageEl = document.createElement('div');
  damageEl.className = 'damage-number' + (isCritical ? ' critical' : '');
  damageEl.textContent = damage;
  
  const bossRect = boss.getBoundingClientRect();
  const randomX = bossRect.left + bossRect.width/2 + (Math.random() * 100 - 50);
  const randomY = bossRect.top + bossRect.height/2;
  
  damageEl.style.left = randomX + 'px';
  damageEl.style.top = randomY + 'px';
  
  damageNumbers.appendChild(damageEl);
  
  setTimeout(() => {
    damageEl.remove();
  }, 1000);
}

function bossHitAnimation() {
  boss.classList.add('hit');
  setTimeout(() => {
    boss.classList.remove('hit');
  }, 300);
}

function heroAttackAnimation() {
  hero.classList.add('attacking');
  attackTrail.classList.add('active');
  
  setTimeout(() => {
    hero.classList.remove('attacking');
    attackTrail.classList.remove('active');
  }, 400);
}

function createImpactParticles(isCritical = false) {
  const particleCount = isCritical ? 20 : 10;
  const bossRect = boss.getBoundingClientRect();
  const centerX = bossRect.left + bossRect.width / 2;
  const centerY = bossRect.top + bossRect.height / 2;
  
  const colors = ['#7ED957', '#5FA838', '#4A7C2F'];
  
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('img');
    particle.className = 'particle minecraft-block';
    
    const color = colors[Math.floor(Math.random() * colors.length)];
    particle.src = pixelGen.generateBlockParticle(color, 12);
    
    const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.3;
    const velocity = 80 + Math.random() * 120;
    let vx = Math.cos(angle) * velocity;
    let vy = Math.sin(angle) * velocity - 50;
    
    particle.style.position = 'absolute';
    particle.style.left = centerX + 'px';
    particle.style.top = centerY + 'px';
    particle.style.zIndex = '50';
    
    particleContainer.appendChild(particle);
    
    let x = 0, y = 0;
    let opacity = 1;
    const gravity = 3;
    let rotation = Math.random() * 360;
    const rotationSpeed = (Math.random() - 0.5) * 20;
    
    const animate = () => {
      x += vx * 0.016;
      vy += gravity;
      y += vy * 0.016;
      rotation += rotationSpeed;
      opacity -= 0.015;
      
      particle.style.transform = `translate(${x}px, ${y}px) rotate(${rotation}deg)`;
      particle.style.opacity = opacity;
      
      if (opacity > 0 && y < 500) {
        requestAnimationFrame(animate);
      } else {
        particle.remove();
      }
    };
    
    requestAnimationFrame(animate);
  }
}

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
  for (let i = 0; i < 50; i++) {
    setTimeout(() => {
      const particle = document.createElement('div');
      particle.className = 'particle confetti';
      particle.style.background = ['#FFD93D', '#FFB627', '#FF6B3D', '#06FFA5'][Math.floor(Math.random() * 4)];
      particle.style.left = Math.random() * window.innerWidth + 'px';
      particle.style.top = '-20px';
      particle.style.width = '8px';
      particle.style.height = '8px';
      
      particleContainer.appendChild(particle);
      
      let y = -20;
      let x = parseFloat(particle.style.left);
      const velocity = 2 + Math.random() * 3;
      const drift = (Math.random() - 0.5) * 3;
      
      const fall = () => {
        y += velocity;
        x += drift;
        particle.style.top = y + 'px';
        particle.style.left = x + 'px';
        
        if (y < window.innerHeight + 50) {
          requestAnimationFrame(fall);
        } else {
          particle.remove();
        }
      };
      
      requestAnimationFrame(fall);
    }, i * 30);
  }
}

function simulateAttack() {
  const username = document.getElementById('usernameInput').value || 'Steve';
  socket.emit('attack', { username });
}

function simulateHeavy() {
  const username = document.getElementById('usernameInput').value || 'Steve';
  socket.emit('attack', { username });
}

function resetBoss() {
  socket.emit('resetBoss');
}

function addChatLog(message) {
  const log = document.createElement('div');
  const time = new Date().toLocaleTimeString('en-US', { 
    hour12: fa