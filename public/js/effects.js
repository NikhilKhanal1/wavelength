// effects.js - Particle engine, background animation, reactions

let vfxEnabled = true;

// ===================== PARTICLE ENGINE =====================
const particleCanvas = document.getElementById('particle-canvas');
const pCtx = particleCanvas.getContext('2d');
let particles = [];

function resizeParticleCanvas() {
  particleCanvas.width = window.innerWidth;
  particleCanvas.height = window.innerHeight;
}
resizeParticleCanvas();
window.addEventListener('resize', resizeParticleCanvas);

class Particle {
  constructor(x, y, color, opts) {
    opts = opts || {};
    this.x = x; this.y = y;
    var speed = opts.speed || 8;
    var angle = opts.angle !== undefined ? opts.angle : Math.random() * Math.PI * 2;
    var v = (Math.random() * 0.6 + 0.4) * speed;
    this.vx = Math.cos(angle) * v + (Math.random() - 0.5) * 2;
    this.vy = Math.sin(angle) * v - (opts.upward || 0);
    this.gravity = opts.gravity || 0.25;
    this.life = 1;
    this.decay = opts.decay || (0.004 + Math.random() * 0.004);
    this.size = opts.size || (1.5 + Math.random() * 3);
    this.color = color;
    this.bounced = 0;
    this.floor = particleCanvas.height - 30;
    this.friction = 0.65;
    this.settled = false;
    this.isConfetti = opts.confetti || false;
  }
  update() {
    if (this.settled) { this.life -= 0.006; return; }
    this.vy += this.gravity;
    this.x += this.vx; this.y += this.vy;
    this.life -= this.decay;
    if (this.y >= this.floor) {
      this.y = this.floor; this.vy *= -this.friction; this.vx *= 0.75;
      this.bounced++;
      if (this.bounced > 2 || Math.abs(this.vy) < 0.8) {
        this.settled = true; this.vy = 0; this.vx = 0;
      }
    }
  }
  draw(ctx) {
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.fillStyle = this.color;
    if (this.isConfetti) {
      ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.life * 5);
      ctx.fillRect(-this.size / 2, -this.size / 4, this.size, this.size / 2);
      ctx.restore();
    } else {
      ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    }
    ctx.globalAlpha = 1;
  }
}

function explode(x, y, count, colors, opts) {
  if (!vfxEnabled) return;
  count = count || 40; colors = colors || PALETTE; opts = opts || {};
  for (var i = 0; i < count; i++) {
    particles.push(new Particle(x, y, colors[Math.floor(Math.random() * colors.length)], opts));
  }
}

function fireParticles(x, y, count) {
  if (!vfxEnabled) return;
  count = count || 15;
  for (var i = 0; i < count; i++) {
    particles.push(new Particle(x, y, ['#ff4500','#ff6b00','#ffa500','#ffcc00'][Math.floor(Math.random() * 4)], {
      speed: 3 + Math.random() * 3, gravity: -0.12, decay: 0.012, size: 2 + Math.random() * 3, upward: 4
    }));
  }
}

function explodeConfetti(x, y, count) {
  if (!vfxEnabled) return;
  count = count || 25;
  for (var i = 0; i < count; i++) {
    particles.push(new Particle(x, y, PALETTE[Math.floor(Math.random() * PALETTE.length)], {
      speed: 4 + Math.random() * 3, gravity: 0.12, decay: 0.006, size: 3 + Math.random() * 4, confetti: true
    }));
  }
}

function sparkle(x, y, count) {
  if (!vfxEnabled) return;
  count = count || 10;
  for (var i = 0; i < count; i++) {
    particles.push(new Particle(x, y, '#fff', {
      speed: 2 + Math.random() * 2, gravity: 0.02, decay: 0.02, size: 1 + Math.random() * 1.5
    }));
  }
}

function animateParticles() {
  pCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
  particles = particles.filter(function(p) { return p.life > 0; });
  for (var i = 0; i < particles.length; i++) {
    particles[i].update();
    particles[i].draw(pCtx);
  }
  requestAnimationFrame(animateParticles);
}
animateParticles();

// ===================== BACKGROUND FLOATING ICONS =====================
const bgCanvas = document.getElementById('bg-canvas');
const bgCtx = bgCanvas.getContext('2d');
let bgIcons = [];

function resizeBgCanvas() {
  bgCanvas.width = window.innerWidth;
  bgCanvas.height = window.innerHeight;
}
resizeBgCanvas();
window.addEventListener('resize', resizeBgCanvas);

const iconDrawers = [
  function(c, s) { c.beginPath(); for (var i = 0; i < 5; i++) { var a = Math.PI * 2 / 5 * i - Math.PI / 2; var b = Math.PI * 2 / 5 * i + Math.PI / 5 - Math.PI / 2; c.lineTo(s / 2 + Math.cos(a) * s / 2, s / 2 + Math.sin(a) * s / 2); c.lineTo(s / 2 + Math.cos(b) * s / 5, s / 2 + Math.sin(b) * s / 5); } c.closePath(); c.fill(); },
  function(c, s) { c.beginPath(); c.arc(s / 2, s / 2, s / 3, 0, Math.PI * 2); c.fill(); },
  function(c, s) { c.beginPath(); c.moveTo(s / 2, 0); c.lineTo(s, s / 2); c.lineTo(s / 2, s); c.lineTo(0, s / 2); c.closePath(); c.fill(); },
  function(c, s) { c.beginPath(); c.moveTo(0, s / 2); for (var i = 0; i < s; i += 3) c.lineTo(i, s / 2 + Math.sin(i * 0.4) * s / 3); c.stroke(); },
  function(c, s) { c.beginPath(); c.moveTo(s / 2, 0); c.lineTo(s, s); c.lineTo(0, s); c.closePath(); c.fill(); }
];

for (var i = 0; i < 70; i++) {
  bgIcons.push({
    x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight,
    vx: (Math.random() - 0.5) * 1.2, vy: (Math.random() - 0.5) * 0.9,
    size: 10 + Math.random() * 28, opacity: 0.03 + Math.random() * 0.05,
    color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
    icon: iconDrawers[Math.floor(Math.random() * iconDrawers.length)],
    rotation: Math.random() * Math.PI * 2, rotSpeed: (Math.random() - 0.5) * 0.015,
    pulsePhase: Math.random() * Math.PI * 2
  });
}

function animateBg() {
  bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
  for (var i = 0; i < bgIcons.length; i++) {
    var icon = bgIcons[i];
    icon.x += icon.vx; icon.y += icon.vy;
    icon.rotation += icon.rotSpeed; icon.pulsePhase += 0.03;
    if (icon.x < -60) icon.x = bgCanvas.width + 60;
    if (icon.x > bgCanvas.width + 60) icon.x = -60;
    if (icon.y < -60) icon.y = bgCanvas.height + 60;
    if (icon.y > bgCanvas.height + 60) icon.y = -60;
    var pulse = 1 + Math.sin(icon.pulsePhase) * 0.2;
    bgCtx.save();
    bgCtx.translate(icon.x, icon.y); bgCtx.rotate(icon.rotation); bgCtx.scale(pulse, pulse);
    bgCtx.globalAlpha = icon.opacity; bgCtx.shadowColor = icon.color; bgCtx.shadowBlur = 5;
    bgCtx.strokeStyle = icon.color; bgCtx.fillStyle = icon.color; bgCtx.lineWidth = 2;
    icon.icon(bgCtx, icon.size);
    bgCtx.restore();
  }
  requestAnimationFrame(animateBg);
}
animateBg();

// ===================== CATEGORY-MATCHED BACKGROUND ICONS =====================
const categoryIconMap = {
  'movie': function(c,s){c.beginPath();c.arc(s/2,s/2,s/3,0,Math.PI*2);c.fill();c.beginPath();c.moveTo(s*0.35,s*0.3);c.lineTo(s*0.35,s*0.7);c.lineTo(s*0.7,s/2);c.closePath();c.fillStyle='var(--bg)';c.fill();},
  'song': function(c,s){c.beginPath();c.arc(s*0.3,s*0.7,s*0.2,0,Math.PI*2);c.fill();c.fillRect(s*0.48,s*0.15,s*0.06,s*0.55);c.beginPath();c.arc(s*0.7,s*0.55,s*0.15,0,Math.PI*2);c.fill();c.fillRect(s*0.83,s*0.1,s*0.06,s*0.45);},
  'food': function(c,s){c.beginPath();c.ellipse(s/2,s*0.6,s*0.4,s*0.25,0,0,Math.PI*2);c.fill();c.beginPath();c.arc(s/2,s*0.45,s*0.15,Math.PI,0);c.fill();},
  'default': function(c,s){c.beginPath();c.arc(s/2,s/2,s*0.3,0,Math.PI*2);c.fill();}
};

function getCategoryIcon(categoryText) {
  if (!categoryText) return categoryIconMap['default'];
  var lower = categoryText.toLowerCase();
  if (lower.includes('movie') || lower.includes('film')) return categoryIconMap['movie'];
  if (lower.includes('song') || lower.includes('music') || lower.includes('banger')) return categoryIconMap['song'];
  if (lower.includes('food') || lower.includes('delicious') || lower.includes('snack') || lower.includes('dessert') || lower.includes('chain')) return categoryIconMap['food'];
  return categoryIconMap['default'];
}

let currentBgIconDrawer = null;
function switchBgIcons(category) {
  var newDrawer = getCategoryIcon(category);
  if (newDrawer === currentBgIconDrawer) return;
  currentBgIconDrawer = newDrawer;
  bgIcons.forEach(function(icon, i) {
    setTimeout(function() {
      icon.icon = newDrawer; icon.opacity = 0;
      setTimeout(function() { icon.opacity = 0.03 + Math.random() * 0.05; }, 300);
    }, i * 30);
  });
}

// ===================== FLOATING REACTIONS =====================
const REACTIONS = [
  {name:'heart',svg:'<svg viewBox="0 0 24 24" width="28" height="28"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#ff6b6b"/></svg>'},
  {name:'laugh',svg:'<svg viewBox="0 0 24 24" width="28" height="28"><circle cx="12" cy="12" r="10" fill="#feca57" stroke="#e8b830" stroke-width="1"/><circle cx="8" cy="10" r="1.5" fill="#333"/><circle cx="16" cy="10" r="1.5" fill="#333"/><path d="M8 15c0 0 2 3 4 3s4-3 4-3" stroke="#333" fill="none" stroke-width="1.5" stroke-linecap="round"/></svg>'},
  {name:'fire',svg:'<svg viewBox="0 0 24 24" width="28" height="28"><path d="M12 2c0 4-6 7-6 13a6 6 0 0012 0c0-6-6-9-6-13z" fill="#ff6b00"/><path d="M12 10c0 2-2.5 3.5-2.5 7a2.5 2.5 0 005 0c0-3.5-2.5-5-2.5-7z" fill="#feca57"/></svg>'},
  {name:'skull',svg:'<svg viewBox="0 0 24 24" width="28" height="28"><ellipse cx="12" cy="10" rx="8" ry="9" fill="#e0e0e0" stroke="#999" stroke-width="1"/><circle cx="9" cy="9" r="2.5" fill="#333"/><circle cx="15" cy="9" r="2.5" fill="#333"/><path d="M9 16v3M12 16v3M15 16v3" stroke="#333" stroke-width="1.5"/></svg>'},
  {name:'star',svg:'<svg viewBox="0 0 24 24" width="28" height="28"><polygon points="12,2 15,9 22,9 16.5,14 18.5,21 12,17 5.5,21 7.5,14 2,9 9,9" fill="#feca57" stroke="#d4a017" stroke-width="0.5"/></svg>'},
  {name:'lightning',svg:'<svg viewBox="0 0 24 24" width="28" height="28"><polygon points="13,2 6,13 11,13 9,22 18,10 12,10 15,2" fill="#48dbfb" stroke="#0abde3" stroke-width="0.5"/></svg>'}
];

function initReactionPanel() {
  var btn = document.createElement('div'); btn.id = 'reaction-btn';
  btn.style.cssText = 'position:fixed;bottom:30px;right:30px;z-index:90;width:50px;height:50px;background:rgba(126,207,207,0.3);border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:20px;border:2px solid rgba(126,207,207,0.5);transition:all 0.2s;backdrop-filter:blur(4px);';
  btn.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24"><polygon points="12,2 15,9 22,9 16.5,14 18.5,21 12,17 5.5,21 7.5,14 2,9 9,9" fill="#7ecfcf"/></svg>';
  btn.addEventListener('click', toggleReactionPanel);
  document.body.appendChild(btn);

  var panel = document.createElement('div'); panel.id = 'reaction-panel';
  panel.style.cssText = 'position:fixed;bottom:90px;right:20px;z-index:90;display:none;flex-direction:column;gap:8px;padding:12px;background:var(--surface);border:2px solid var(--surface-light);border-radius:var(--radius);';
  REACTIONS.forEach(function(r) {
    var b = document.createElement('button'); b.innerHTML = r.svg;
    b.style.cssText = 'background:none;border:none;cursor:pointer;padding:4px;border-radius:6px;transition:background 0.15s;';
    b.addEventListener('mouseenter', function() { b.style.background = 'rgba(255,255,255,0.1)'; });
    b.addEventListener('mouseleave', function() { b.style.background = 'none'; });
    b.addEventListener('click', function() {
      socket.emit('reaction', { icon: r.name });
      floatReaction(r); playSound('select');
      panel.style.display = 'none';
    });
    panel.appendChild(b);
  });
  document.body.appendChild(panel);
}

function toggleReactionPanel() {
  var p = document.getElementById('reaction-panel');
  p.style.display = p.style.display === 'flex' ? 'none' : 'flex';
}

function floatReaction(r) {
  var el = document.createElement('div');
  el.className = 'floating-reaction';
  el.innerHTML = r.svg ? r.svg.replace('width="28"', 'width="32"').replace('height="28"', 'height="32"') : '';
  var startX = window.innerWidth * (0.3 + Math.random() * 0.4);
  var y = window.innerHeight - 80;
  var phase = Math.random() * Math.PI * 2;
  var spd = 1.2 + Math.random() * 0.5;
  var amp = 25 + Math.random() * 20;
  el.style.position = 'fixed'; el.style.zIndex = '95'; el.style.pointerEvents = 'none';
  el.style.left = startX + 'px'; el.style.bottom = '80px'; el.style.fontSize = '28px';
  document.body.appendChild(el);
  var frm = 0;
  function anim() {
    frm++; y -= spd;
    var sc = 1 + frm * 0.003;
    var xOff = Math.sin(phase + frm * 0.04) * amp;
    el.style.left = (startX + xOff) + 'px';
    el.style.bottom = (window.innerHeight - y) + 'px';
    el.style.transform = 'scale(' + sc + ')';
    el.style.opacity = String(Math.max(0, 1 - frm / 300));
    if (frm > 300 || y < -50) { el.remove(); return; }
    requestAnimationFrame(anim);
  }
  anim();
}
