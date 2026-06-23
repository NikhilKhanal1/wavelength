// creatures.js - Pixel birds, dog, monkey, bananas

let monkeyActive = false;
let dogInstance = null;

// ===================== PIXEL BIRDS =====================
class PixelBird {
  constructor(delay) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 24; this.canvas.height = 20;
    this.canvas.style.cssText = 'position:fixed;z-index:12;pointer-events:none;image-rendering:pixelated;width:48px;height:40px;';
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.colors = ['#ff6b6b','#4ecdc4','#feca57','#a29bfe','#fd79a8'][Math.floor(Math.random() * 5)];
    this.x = -60 - delay * 200; this.y = 50 + Math.random() * 100;
    this.speed = 1.5 + Math.random() * 1; this.wobble = Math.random() * Math.PI * 2;
    this.flapFrame = 0; this.destroyed = false;
    this.draw(0); this.animate();
  }
  draw(flap) {
    var c = this.ctx; c.clearRect(0, 0, 24, 20);
    c.fillStyle = this.colors;
    c.fillRect(8, 8, 8, 6); c.fillRect(6, 9, 12, 4);
    c.fillRect(16, 6, 5, 5);
    c.fillStyle = '#fff'; c.fillRect(18, 7, 2, 2);
    c.fillStyle = '#111'; c.fillRect(19, 7, 1, 1);
    c.fillStyle = '#f39c12'; c.fillRect(21, 9, 2, 1);
    c.fillStyle = this.colors;
    if (flap) { c.fillRect(9, 5, 5, 3); } else { c.fillRect(9, 11, 5, 3); }
    c.fillRect(4, 8, 3, 2);
  }
  animate() {
    if (this.destroyed) return;
    this.x += this.speed; this.wobble += 0.07;
    this.canvas.style.left = this.x + 'px';
    this.canvas.style.top = (this.y + Math.sin(this.wobble) * 12) + 'px';
    this.flapFrame++;
    if (this.flapFrame % 8 === 0) this.draw(this.flapFrame % 16 < 8);
    if (this.x > window.innerWidth + 80) { this.x = -60; this.y = 50 + Math.random() * 100; }
    if (this.flapFrame % 400 === 0 && Math.random() < 0.2) {
      if (audioCtx) {
        var o = audioCtx.createOscillator(); var g = audioCtx.createGain();
        o.type = 'sine'; o.frequency.value = 2000 + Math.random() * 1000;
        o.frequency.exponentialRampToValueAtTime(1500, audioCtx.currentTime + 0.08);
        g.gain.value = 0.02; g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
        o.connect(g); g.connect(sfxGain); o.start(); o.stop(audioCtx.currentTime + 0.12);
      }
    }
    requestAnimationFrame(this.animate.bind(this));
  }
  destroy() { this.destroyed = true; this.canvas.remove(); }
}

// ===================== PIXEL BANANA =====================
class PixelBanana {
  constructor(x, y) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 12; this.canvas.height = 8;
    this.canvas.style.cssText = 'position:fixed;top:' + y + 'px;left:' + x + 'px;width:36px;height:24px;z-index:13;pointer-events:none;image-rendering:pixelated;';
    document.body.appendChild(this.canvas);
    this.drawBanana();
    this.x = x; this.y = y; this.vx = (Math.random() - 0.5) * 10; this.vy = 0;
    this.rotation = 0; this.floor = window.innerHeight - 40;
    this.destroyed = false; this.animate();
  }
  drawBanana() {
    var c = this.canvas.getContext('2d'); c.clearRect(0, 0, 12, 8);
    c.fillStyle = '#FFD700';
    c.fillRect(1,3,1,1);c.fillRect(2,2,1,1);c.fillRect(3,1,1,1);c.fillRect(4,0,2,1);
    c.fillRect(6,1,1,1);c.fillRect(7,2,1,1);c.fillRect(8,3,1,1);c.fillRect(9,4,1,1);c.fillRect(10,5,1,1);
    c.fillStyle = '#FFEC8B';
    c.fillRect(2,3,1,1);c.fillRect(3,2,1,1);c.fillRect(4,1,2,1);c.fillRect(6,2,1,1);c.fillRect(7,3,1,1);c.fillRect(8,4,1,1);c.fillRect(9,5,1,1);
    c.fillStyle = '#8B6914';
    c.fillRect(0,4,1,1);c.fillRect(11,5,1,1);
  }
  animate() {
    if (this.destroyed) return;
    this.vy += 0.08; this.y += this.vy;
    this.rotation += 15;
    this.canvas.style.top = this.y + 'px'; this.canvas.style.left = this.x + 'px';
    this.canvas.style.transform = 'rotate(' + this.rotation + 'deg)';
    if (this.y >= this.floor) {
      playSound('splat');
      explode(this.x + 18, this.floor, 18, ['#FFD700','#FFA500','#FF8C00','#FFEE00'], {speed:5, gravity:0.2, decay:0.008, size:3});
      this.canvas.remove(); this.destroyed = true; return;
    }
    requestAnimationFrame(this.animate.bind(this));
  }
}

// ===================== MONKEY =====================
class Monkey {
  constructor() {
    this.wrapper = document.createElement('div');
    this.wrapper.style.cssText = 'position:fixed;top:0;left:0;z-index:14;pointer-events:none;width:100%;height:100%;';
    this.vineCanvas = document.createElement('canvas');
    this.vineCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;';
    this.wrapper.appendChild(this.vineCanvas);
    this.monkeyCanvas = document.createElement('canvas');
    this.monkeyCanvas.width = 40; this.monkeyCanvas.height = 48;
    this.monkeyCanvas.style.cssText = 'position:absolute;width:80px;height:96px;image-rendering:pixelated;';
    this.wrapper.appendChild(this.monkeyCanvas);
    document.body.appendChild(this.wrapper);
    this.drawMonkey();
    this.pivotX = 100 + Math.random() * (window.innerWidth - 200); this.pivotY = 0;
    this.ropeLen = 280;
    this.fromLeft = Math.random() > 0.5;
    this.angle = this.fromLeft ? -1.2 : 1.2;
    this.angleVel = 0; this.gravity = 0.0004;
    this.phase = 'swing'; this.bananasThrown = 0;
    this.swingCount = 0; this.throwCooldown = 0;
    this.destroyed = false;
    playSound('vineunfurl');
    this.animate();
  }
  drawMonkey() {
    var c = this.monkeyCanvas.getContext('2d'); c.clearRect(0, 0, 40, 48);
    var P = 2;
    var draw = function(x, y, col) { c.fillStyle = col; c.fillRect(x * P, y * P, P, P); };
    var BR = '#8B4513', LB = '#D2691E', BL = '#F4A460', EY = '#111', HI = '#fff';
    for (var dx = -3; dx <= 3; dx++) for (var dy = -3; dy <= 3; dy++) { if (dx*dx+dy*dy <= 10) draw(10+dx, 5+dy, BR); }
    for (var dx = -2; dx <= 2; dx++) for (var dy = -1; dy <= 2; dy++) { if (dx*dx+dy*dy <= 5) draw(10+dx, 6+dy, BL); }
    draw(9,5,EY); draw(11,5,EY); draw(9,4,HI); draw(11,4,HI);
    draw(6,4,LB); draw(7,4,LB); draw(13,4,LB); draw(14,4,LB);
    for (var y = 9; y <= 16; y++) for (var x = 8; x <= 12; x++) draw(x, y, BR);
    for (var y = 10; y <= 15; y++) for (var x = 9; x <= 11; x++) draw(x, y, BL);
    draw(6,10,BR);draw(7,10,BR);draw(6,11,BR);draw(13,10,BR);draw(14,10,BR);draw(14,11,BR);
    draw(8,17,BR);draw(9,17,BR);draw(8,18,BR);draw(11,17,BR);draw(12,17,BR);draw(12,18,BR);
    draw(13,13,BR);draw(14,13,BR);draw(15,12,BR);draw(16,11,BR);draw(16,10,BR);draw(15,10,BR);
  }
  drawVine(mx, my) {
    var c = this.vineCanvas.getContext('2d');
    this.vineCanvas.width = window.innerWidth; this.vineCanvas.height = window.innerHeight;
    c.strokeStyle = '#5a3e1b'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(this.pivotX, this.pivotY); c.lineTo(mx + 40, my + 10); c.stroke();
    c.strokeStyle = '#3a6e1b'; c.lineWidth = 2;
    for (var i = 0; i < 5; i++) {
      var t = i / 5; var lx = this.pivotX + (mx + 40 - this.pivotX) * t; var ly = this.pivotY + (my + 10 - this.pivotY) * t;
      c.beginPath(); c.moveTo(lx, ly); c.lineTo(lx + 5, ly + 4); c.stroke();
    }
  }
  animate() {
    if (this.destroyed) return;
    if (this.phase === 'done') { this.wrapper.remove(); monkeyActive = false; this.destroyed = true; return; }
    if (this.phase === 'ascend') {
      this.ropeLen -= 4;
      if (this.ropeLen <= 0) { this.phase = 'done'; this.wrapper.remove(); monkeyActive = false; this.destroyed = true; return; }
    }
    this.angleVel += (-this.gravity * Math.sin(this.angle));
    this.angleVel *= 0.997;
    this.angle += this.angleVel;
    var mx = this.pivotX + Math.sin(this.angle) * this.ropeLen - 40;
    var my = this.pivotY + Math.cos(this.angle) * this.ropeLen - 48;
    this.monkeyCanvas.style.left = mx + 'px'; this.monkeyCanvas.style.top = my + 'px';
    this.drawVine(mx, my);
    if (this.bananasThrown < 2 && Math.abs(this.angle) < 0.3 && this.phase === 'swing') {
      if (this.throwCooldown <= 0) {
        new PixelBanana(mx + 40, my + 96);
        if (dogInstance && dogInstance.ballPopped && !dogInstance.ballReplaced) {
          dogInstance.ballReplaced = true;
          dogInstance.dropNewBall(mx + 40, my + 96);
        }
        this.bananasThrown++; this.throwCooldown = 30;
      }
    }
    if (this.throwCooldown > 0) this.throwCooldown--;
    if (this.lastAngle !== undefined && ((this.lastAngle < 0 && this.angle >= 0) || (this.lastAngle > 0 && this.angle <= 0))) {
      this.swingCount++;
      if (this.swingCount >= 2) { this.phase = 'ascend'; }
    }
    this.lastAngle = this.angle;
    requestAnimationFrame(this.animate.bind(this));
  }
}

// ===================== PIXEL DOG =====================
class PixelDog {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 32; this.canvas.height = 24;
    this.canvas.style.cssText = 'position:fixed;bottom:12px;z-index:14;cursor:pointer;image-rendering:pixelated;width:64px;height:48px;';
    this.canvas.style.left = '80%';
    this.canvas.addEventListener('click', this.bark.bind(this));
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.tailFrame = 0; this.dogX = window.innerWidth * 0.8;
    this.ballCanvas = document.createElement('canvas');
    this.ballCanvas.width = 12; this.ballCanvas.height = 12;
    this.ballCanvas.style.cssText = 'position:fixed;z-index:14;cursor:pointer;image-rendering:pixelated;width:28px;height:28px;';
    this.ballCanvas.addEventListener('click', this.squeakBall.bind(this));
    document.body.appendChild(this.ballCanvas);
    this.drawBall();
    this.ballX = window.innerWidth * 0.75; this.ballY = window.innerHeight - 46;
    this.ballClicks = 0; this.ballPopped = false; this.ballReplaced = false;
    this.ballVx = 0; this.ballVy = 0; this.ballMoving = false;
    this.gravity = 0.3; this.floor = window.innerHeight - 46;
    this.crying = false; this.barkTimer = 0; this.destroyed = false;
    this.updateBallPos(); this.drawDog(0); this.animLoop();
  }
  drawDog(tailAngle) {
    var c = this.ctx; c.clearRect(0, 0, 32, 24);
    var draw = function(x, y, col) { c.fillStyle = col; c.fillRect(x, y, 1, 1); };
    var BR = '#8B6914', TN = '#C4A44A', DK = '#5C4400', EY = '#111', NS = '#333';
    for (var x = 8; x <= 22; x++) for (var y = 10; y <= 17; y++) draw(x, y, BR);
    for (var x = 10; x <= 20; x++) for (var y = 12; y <= 16; y++) draw(x, y, TN);
    for (var x = 3; x <= 12; x++) for (var y = 5; y <= 13; y++) { if ((x-7.5)*(x-7.5)+(y-9)*(y-9) < 20) draw(x, y, BR); }
    for (var x = 2; x <= 6; x++) for (var y = 9; y <= 12; y++) draw(x, y, TN);
    draw(2,10,NS); draw(6,7,EY); draw(9,7,EY); draw(6,6,'#fff'); draw(9,6,'#fff');
    for (var y = 4; y <= 9; y++) { draw(3,y,DK); draw(4,y,DK); draw(11,y,DK); draw(12,y,DK); }
    for (var y = 17; y <= 21; y++) { draw(10,y,DK); draw(11,y,DK); draw(19,y,DK); draw(20,y,DK); }
    var ty = tailAngle > 0 ? 8 : 10;
    draw(23,ty,BR); draw(24,ty,BR); draw(25,ty-1,BR); draw(26,ty-1,BR);
  }
  drawDogSad() {
    var c = this.ctx; c.clearRect(0, 0, 32, 24);
    var draw = function(x, y, col) { c.fillStyle = col; c.fillRect(x, y, 1, 1); };
    var BR = '#8B6914', TN = '#C4A44A', DK = '#5C4400';
    for (var x = 8; x <= 22; x++) for (var y = 10; y <= 17; y++) draw(x, y, BR);
    for (var x = 10; x <= 20; x++) for (var y = 12; y <= 16; y++) draw(x, y, TN);
    for (var x = 3; x <= 12; x++) for (var y = 5; y <= 13; y++) { if ((x-7.5)*(x-7.5)+(y-9)*(y-9) < 20) draw(x, y, BR); }
    for (var x = 2; x <= 6; x++) for (var y = 9; y <= 12; y++) draw(x, y, TN);
    draw(2,10,'#333');
    draw(5,7,'#111'); draw(6,7,'#111'); draw(7,7,'#111'); draw(9,7,'#111'); draw(10,7,'#111');
    draw(6,6,'#4488ff'); draw(10,6,'#4488ff');
    for (var y = 4; y <= 9; y++) { draw(3,y,DK); draw(4,y,DK); draw(11,y,DK); draw(12,y,DK); }
    for (var y = 17; y <= 21; y++) { draw(10,y,DK); draw(11,y,DK); draw(19,y,DK); draw(20,y,DK); }
    draw(23,10,BR); draw(24,10,BR); draw(24,11,BR);
  }
  drawBall() {
    var c = this.ballCanvas.getContext('2d'); c.clearRect(0, 0, 12, 12);
    for (var x = 0; x < 12; x++) for (var y = 0; y < 12; y++) {
      var dx = x - 6, dy = y - 6;
      if (dx*dx + dy*dy <= 30) {
        c.fillStyle = Math.sin(Math.atan2(dy, dx) * 2) > 0 ? '#e74c3c' : '#3498db';
        c.fillRect(x, y, 1, 1);
      }
    }
    c.fillStyle = '#fff'; c.fillRect(4, 3, 2, 2);
  }
  updateBallPos() { this.ballCanvas.style.left = this.ballX + 'px'; this.ballCanvas.style.top = this.ballY + 'px'; }
  bark() {
    initAudio();
    var o = audioCtx.createOscillator(); var g = audioCtx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(300, audioCtx.currentTime);
    o.frequency.setValueAtTime(450, audioCtx.currentTime + 0.05);
    o.frequency.setValueAtTime(250, audioCtx.currentTime + 0.1);
    g.gain.setValueAtTime(0.12, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
    var f = audioCtx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 800;
    o.connect(f); f.connect(g); g.connect(sfxGain); o.start(); o.stop(audioCtx.currentTime + 0.18);
    sparkle(this.dogX + 32, window.innerHeight - 40, 6);
  }
  squeakBall() {
    if (this.ballPopped) return;
    this.ballClicks++;
    if (this.ballClicks >= 10) { this.popBall(); return; }
    this.ballVx = (Math.random() - 0.5) * 16;
    this.ballVy = -(Math.random() * 5 + 5);
    this.ballMoving = true;
    try {
      initAudio();
      var o = audioCtx.createOscillator(); var g = audioCtx.createGain();
      o.type = 'sine'; o.frequency.value = 1200;
      o.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.1);
      g.gain.setValueAtTime(0.12, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
      o.connect(g); g.connect(sfxGain); o.start(); o.stop(audioCtx.currentTime + 0.15);
    } catch (e) { console.warn('squeakBall audio error:', e); }
  }
  popBall() {
    this.ballPopped = true;
    initAudio();
    var bx = this.ballX + 14, by = this.ballY;
    explode(bx, by, 100, BRIGHT_PALETTE, {speed: 12, gravity: 0.2, decay: 0.005, size: 12});
    playSound('gameover');
    this.ballCanvas.style.display = 'none';
    this.drawDogSad();
    this.crying = true; this.ballReplaced = false;
    var self = this;
    setTimeout(function() { if (!monkeyActive) { monkeyActive = true; new Monkey(); } }, 5000);
  }
  dropNewBall(x, y) {
    this.ballPopped = false; this.crying = false; this.ballReplaced = false; this.ballClicks = 0;
    this.ballX = x; this.ballY = y;
    this.ballVx = (Math.random() - 0.5) * 4; this.ballVy = 0; this.ballMoving = true;
    this.ballCanvas.style.display = 'block';
    this.drawBall(); this.drawDog(0);
  }
  showQuip() {
    if (Math.random() > 0.15) return;
    var quips = ['Woof.','Bark.','Bork!','Ball?','*pant pant*','Arf!','Woof woof.','Bork bork!'];
    var isRainbow = Math.random() < 0.08;
    var text = isRainbow ? 'Nobody will believe you.' : quips[Math.floor(Math.random() * quips.length)];
    var el = document.createElement('div');
    el.style.cssText = 'position:fixed;bottom:65px;z-index:16;pointer-events:none;background:#fff;color:#333;padding:8px 14px;border-radius:12px 12px 12px 2px;font-size:0.85rem;font-family:var(--font-body);font-weight:600;box-shadow:0 3px 10px rgba(0,0,0,0.2);left:' + (this.dogX + 10) + 'px;transition:opacity 1s;';
    if (isRainbow) {
      el.style.background = 'linear-gradient(90deg,#ff6b6b,#feca57,#7ecfa0,#48dbfb,#a07edb,#ff9ff3)';
      el.style.backgroundSize = '200% 100%'; el.style.webkitBackgroundClip = 'text';
      el.style.webkitTextFillColor = 'transparent'; el.style.animation = 'rainbowShift 1s linear infinite';
    }
    el.textContent = text; document.body.appendChild(el);
    setTimeout(function() { el.style.opacity = '0'; }, 2500);
    setTimeout(function() { el.remove(); }, 3500);
  }
  animLoop() {
    if (this.destroyed) return;
    try {
      this.tailFrame++;
      if (this.tailFrame % 12 === 0) this.drawDog(this.tailFrame % 24 < 12 ? 1 : -1);
      if (this.ballMoving) {
        this.ballVy += this.gravity; this.ballX += this.ballVx; this.ballY += this.ballVy;
        if (this.ballY >= this.floor) { this.ballY = this.floor; this.ballVy *= -0.7; if (Math.abs(this.ballVy) < 1) this.ballVy = 0; }
        if (this.ballX <= 0) { this.ballX = 0; this.ballVx *= -0.8; }
        if (this.ballX >= window.innerWidth - 28) { this.ballX = window.innerWidth - 28; this.ballVx *= -0.8; }
        this.ballVx *= 0.99;
        if (Math.abs(this.ballVx) + Math.abs(this.ballVy) < 0.5) { this.ballMoving = false; }
        this.updateBallPos();
      } else {
        if (!this.ballPopped && Math.random() < 0.003) { this.squeakBall(); }
        var target = this.ballX + 14;
        if (Math.abs(this.dogX - target) > 5) {
          var dir = target > this.dogX ? 1 : -1; this.dogX += dir * 1.5;
          this.canvas.style.left = this.dogX + 'px';
          this.canvas.style.transform = dir > 0 ? 'scaleX(-1)' : 'scaleX(1)';
        }
      }
      if (this.crying && Math.random() < 0.3) {
        particles.push(new Particle(this.dogX + 32, window.innerHeight - 48, '#4488ff', {speed:1, gravity:0.15, decay:0.015, size:2, angle:Math.PI/2}));
        particles.push(new Particle(this.dogX + 24, window.innerHeight - 48, '#4488ff', {speed:1, gravity:0.15, decay:0.015, size:2, angle:Math.PI/2}));
      }
      this.barkTimer++;
      if (this.barkTimer > 1800 && Math.random() < 0.003) { this.bark(); this.barkTimer = 0; }
    } catch (err) {
      // FIX: Log errors instead of swallowing silently
      console.warn('PixelDog animLoop error:', err);
    }
    requestAnimationFrame(this.animLoop.bind(this));
  }
  destroy() { this.destroyed = true; this.canvas.remove(); this.ballCanvas.remove(); }
}
