class MinecraftStyleGenerator {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
  }

  generateHero(size = 128) {
    this.canvas.width = size;
    this.canvas.height = size * 1.5;
    const ctx = this.ctx;
    const unit = size / 8;
    
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(unit * 1.5, size * 1.4, unit * 5, unit * 0.4);
    
    this.drawMinecraftCube(ctx, unit * 4.5, size * 0.9, unit * 2, unit * 4.5, '#5C7CBA');
    this.drawMinecraftCube(ctx, unit * 1.5, size * 0.9, unit * 2, unit * 4.5, '#5C7CBA');
    this.drawMinecraftCube(ctx, unit * 2, size * 0.35, unit * 4, unit * 6, '#00A8E8');
    this.drawMinecraftCube(ctx, unit * 0.5, size * 0.4, unit * 1.5, unit * 5, '#FFB627');
    this.drawMinecraftCube(ctx, unit * 6, size * 0.4, unit * 1.5, unit * 5, '#FFB627');
    this.drawMinecraftCube(ctx, unit * 2, unit * 1, unit * 4, unit * 4, '#D4A574');
    
    ctx.fillStyle = '#3A9AD9';
    ctx.fillRect(unit * 2.7, unit * 2.2, unit * 0.8, unit * 0.6);
    ctx.fillRect(unit * 4.5, unit * 2.2, unit * 0.8, unit * 0.6);
    
    ctx.fillStyle = '#8B6F47';
    ctx.fillRect(unit * 3, unit * 3.5, unit * 2, unit * 0.3);
    
    ctx.fillStyle = '#6B4423';
    ctx.fillRect(unit * 2, unit * 0.8, unit * 4, unit * 0.8);
    
    return this.canvas.toDataURL();
  }

  drawMinecraftCube(ctx, x, y, w, h, color) {
    const topColor = this.adjustBrightness(color, 1.3);
    ctx.fillStyle = topColor;
    ctx.beginPath();
    ctx.moveTo(x + w/2, y);
    ctx.lineTo(x + w, y + h * 0.2);
    ctx.lineTo(x + w/2, y + h * 0.4);
    ctx.lineTo(x, y + h * 0.2);
    ctx.closePath();
    ctx.fill();
    
    const rightColor = this.adjustBrightness(color, 0.7);
    ctx.fillStyle = rightColor;
    ctx.fillRect(x + w/2, y + h * 0.2, w/2, h * 0.8);
    
    ctx.fillStyle = color;
    ctx.fillRect(x, y + h * 0.2, w/2, h * 0.8);
    
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y + h * 0.2, w/2, h * 0.8);
    ctx.strokeRect(x + w/2, y + h * 0.2, w/2, h * 0.8);
  }

  generateSlimeBoss(size = 256) {
    this.canvas.width = size;
    this.canvas.height = size;
    const ctx = this.ctx;
    const unit = size / 16;
    
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, size, size);
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(size/2, size * 0.85, unit * 6, unit * 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    const bodyY = size * 0.3;
    const bodySize = unit * 10;
    
    this.drawSlimeCube(ctx, size/2 - bodySize/2, bodyY, bodySize, bodySize, '#7ED957', '#5FA838');
    
    const gelSize = bodySize * 0.6;
    ctx.fillStyle = 'rgba(92, 168, 56, 0.6)';
    ctx.fillRect(size/2 - gelSize/2, bodyY + bodySize * 0.2, gelSize, gelSize * 0.7);
    
    const eyeSize = unit * 1.5;
    const eyeY = bodyY + bodySize * 0.35;
    ctx.fillStyle = '#000000';
    ctx.fillRect(size/2 - unit * 3, eyeY, eyeSize, eyeSize);
    ctx.fillRect(size/2 + unit * 1.5, eyeY, eyeSize, eyeSize);
    
    const coreSize = unit * 2;
    const gradient = ctx.createRadialGradient(
      size/2, bodyY + bodySize * 0.6, 0,
      size/2, bodyY + bodySize * 0.6, coreSize
    );
    gradient.addColorStop(0, 'rgba(255, 255, 100, 0.8)');
    gradient.addColorStop(1, 'rgba(255, 255, 100, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(size/2 - coreSize, bodyY + bodySize * 0.5, coreSize * 2, coreSize * 2);
    
    return this.canvas.toDataURL();
  }

  drawSlimeCube(ctx, x, y, w, h, colorLight, colorDark) {
    ctx.fillStyle = colorLight;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = colorDark;
    ctx.fillRect(x + w * 0.7, y, w * 0.3, h);
    ctx.fillRect(x, y + h * 0.8, w, h * 0.2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(x, y, w, h * 0.15);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
  }

  generateBlockParticle(color, size = 16) {
    this.canvas.width = size;
    this.canvas.height = size;
    const ctx = this.ctx;
    
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, size, size);
    
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, size, size);
    
    const darkColor = this.adjustBrightness(color, 0.7);
    ctx.fillStyle = darkColor;
    ctx.fillRect(size * 0.7, 0, size * 0.3, size);
    ctx.fillRect(0, size * 0.7, size, size * 0.3);
    
    const lightColor = this.adjustBrightness(color, 1.3);
    ctx.fillStyle = lightColor;
    ctx.fillRect(0, 0, size * 0.3, size);
    ctx.fillRect(0, 0, size, size * 0.3);
    
    return this.canvas.toDataURL();
  }

  generateGrassPlatform(width = 2000, height = 80) {
    this.canvas.width = width;
    this.canvas.height = height;
    const ctx = this.ctx;
    
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, width, height);
    
    const blockSize = 40;
    const numBlocks = Math.ceil(width / blockSize);
    
    for (let i = 0; i < numBlocks; i++) {
      const x = i * blockSize;
      
      ctx.fillStyle = '#7ED957';
      ctx.fillRect(x, 0, blockSize, height * 0.3);
      
      ctx.fillStyle = '#8B6F47';
      ctx.fillRect(x, height * 0.3, blockSize, height * 0.7);
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(x + blockSize * 0.7, 0, blockSize * 0.3, height);
      
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, 0, blockSize, height);
    }
    
    return this.canvas.toDataURL();
  }

  adjustBrightness(color, factor) {
    const hex = color.replace('#', '');
    const r = Math.min(255, Math.floor(parseInt(hex.substr(0, 2), 16) * factor));
    const g = Math.min(255, Math.floor(parseInt(hex.substr(2, 2), 16) * factor));
    const b = Math.min(255, Math.floor(parseInt(hex.substr(4, 2), 16) * factor));
    return `rgb(${r}, ${g}, ${b})`;
  }
}

class PixelCharacterGenerator extends MinecraftStyleGenerator {}