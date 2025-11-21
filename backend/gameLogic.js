class GameState {
  constructor() {
    this.boss = {
      name: "Magma Slime",
      currentHP: 10000,
      maxHP: 10000,
      isAlive: true
    };
    
    this.hero = {
      attack: 100,
      powerMultiplier: 1.0
    };
    
    this.combo = {
      count: 0,
      lastAttackTime: Date.now(),
      multiplier: 1.0
    };
    
    this.attackers = [];
  }
  
  processAttack(username) {
    if (!this.boss.isAlive) {
      return { success: false, reason: "Boss already dead" };
    }
    
    let damage = this.hero.attack * this.hero.powerMultiplier;
    
    const now = Date.now();
    if (now - this.combo.lastAttackTime < 3000) {
      this.combo.count++;
      
      if (this.combo.count >= 10) this.combo.multiplier = 1.2;
      if (this.combo.count >= 25) this.combo.multiplier = 1.5;
      if (this.combo.count >= 50) this.combo.multiplier = 2.0;
    } else {
      this.combo.count = 1;
      this.combo.multiplier = 1.0;
    }
    this.combo.lastAttackTime = now;
    
    damage *= this.combo.multiplier;
    damage = Math.floor(damage);
    
    this.boss.currentHP -= damage;
    
    if (this.boss.currentHP <= 0) {
      this.boss.currentHP = 0;
      this.boss.isAlive = false;
    }
    
    this.attackers.push({
      username,
      damage,
      timestamp: now
    });
    
    if (this.attackers.length > 100) {
      this.attackers.shift();
    }
    
    return {
      success: true,
      damage,
      bossHP: this.boss.currentHP,
      bossMaxHP: this.boss.maxHP,
      combo: this.combo.count,
      comboMultiplier: this.combo.multiplier,
      bossDefeated: !this.boss.isAlive
    };
  }
  
  getState() {
    return {
      boss: this.boss,
      hero: this.hero,
      combo: this.combo,
      recentAttackers: this.attackers.slice(-10)
    };
  }
  
  reset() {
    this.boss.currentHP = this.boss.maxHP;
    this.boss.isAlive = true;
    this.combo.count = 0;
    this.combo.multiplier = 1.0;
    this.attackers = [];
  }
}

module.exports = GameState;