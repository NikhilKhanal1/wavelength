// dial.js - Tuner dial, guess dial, reveal dial

// ===================== REVEAL DIAL =====================
function buildDial(actual, results, myName) {
  var container = document.getElementById('dial-container');
  container.innerHTML = '';
  var toAngle = function(val) { return ((val - 1) / 9) * 180; };
  var actualAngle = toAngle(actual);
  var W = 600, H = 380, cx = 300, cy = 320, R = 240;
  var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  svg.style.width = '100%'; svg.style.maxWidth = '900px';

  var arcPoint = function(angle, r) {
    var rad = (180 - angle) * Math.PI / 180;
    return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
  };
  var arcPath = function(sA, eA, r) {
    var s = arcPoint(sA, r), e = arcPoint(eA, r);
    var la = (eA - sA) > 180 ? 1 : 0;
    return 'M ' + s.x + ' ' + s.y + ' A ' + r + ' ' + r + ' 0 ' + la + ' 1 ' + e.x + ' ' + e.y;
  };

  // Glow filter
  var defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = '<filter id="glow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>';
  svg.appendChild(defs);

  // Background arc
  var bg = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  bg.setAttribute('d', arcPath(0, 180, R)); bg.setAttribute('fill', 'none');
  bg.setAttribute('stroke', 'var(--surface-light)'); bg.setAttribute('stroke-width', '50');
  bg.setAttribute('stroke-linecap', 'round'); svg.appendChild(bg);

  // Scoring zones
  var zones = [[0.20, 'rgba(217,149,107,0.3)'], [0.10, 'rgba(232,200,110,0.45)'], [0.05, 'rgba(126,207,160,0.6)']];
  zones.forEach(function(z) {
    var hS = z[0] * 180;
    var sA = Math.max(0, actualAngle - hS), eA = Math.min(180, actualAngle + hS);
    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', arcPath(sA, eA, R)); path.setAttribute('fill', 'none');
    path.setAttribute('stroke', z[1]); path.setAttribute('stroke-width', '50');
    svg.appendChild(path);
  });

  // Tick marks
  for (var i = 0; i <= 18; i++) {
    var a = i * 10, p1 = arcPoint(a, R + 28), p2 = arcPoint(a, R + 20);
    var tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    tick.setAttribute('x1', p1.x); tick.setAttribute('y1', p1.y);
    tick.setAttribute('x2', p2.x); tick.setAttribute('y2', p2.y);
    tick.setAttribute('stroke', 'var(--text-dim)');
    tick.setAttribute('stroke-width', i % 3 === 0 ? '2' : '1');
    tick.setAttribute('opacity', i % 3 === 0 ? '0.7' : '0.3');
    svg.appendChild(tick);
  }

  // Labels
  var lL = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  lL.setAttribute('x', cx - R); lL.setAttribute('y', cy + 50);
  lL.setAttribute('text-anchor', 'middle'); lL.setAttribute('font-family', 'JetBrains Mono');
  lL.setAttribute('font-size', '16'); lL.setAttribute('fill', 'var(--accent-cyan)');
  lL.setAttribute('font-weight', '700'); lL.textContent = 'LOW'; svg.appendChild(lL);
  var lR = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  lR.setAttribute('x', cx + R); lR.setAttribute('y', cy + 50);
  lR.setAttribute('text-anchor', 'middle'); lR.setAttribute('font-family', 'JetBrains Mono');
  lR.setAttribute('font-size', '16'); lR.setAttribute('fill', 'var(--accent-pink)');
  lR.setAttribute('font-weight', '700'); lR.textContent = 'HIGH'; svg.appendChild(lR);

  // Answer needle
  var nEnd = arcPoint(actualAngle, R + 5);
  var nAng = (180 - actualAngle) * Math.PI / 180;
  var perpX = Math.sin(nAng), perpY = Math.cos(nAng), bw = 12;
  var nl = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  nl.setAttribute('points', nEnd.x + ',' + nEnd.y + ' ' + (cx + perpX * bw) + ',' + (cy - perpY * bw) + ' ' + (cx - perpX * bw) + ',' + (cy + perpY * bw));
  nl.setAttribute('fill', '#d97bba'); nl.setAttribute('opacity', '0.9'); svg.appendChild(nl);
  var cd = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  cd.setAttribute('cx', cx); cd.setAttribute('cy', cy); cd.setAttribute('r', '14');
  cd.setAttribute('fill', '#d97bba'); svg.appendChild(cd);

  container.appendChild(svg);

  // Parachuting pins
  results.forEach(function(r, i) {
    if (r.guess === null) return;
    setTimeout(function() {
      var angle = toAngle(r.guess);
      var pt = arcPoint(angle, R);
      var color = PALETTE[i % PALETTE.length];
      var isMe = r.name === myName;
      var pg = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      pg.setAttribute('class', 'dial-pin' + (isMe ? ' is-me' : ''));
      var c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', pt.x); c.setAttribute('cy', pt.y);
      c.setAttribute('r', isMe ? '14' : '10'); c.setAttribute('fill', color);
      c.setAttribute('stroke', isMe ? '#fff' : 'rgba(255,255,255,0.5)');
      c.setAttribute('stroke-width', isMe ? '3' : '2');
      if (isMe) c.setAttribute('filter', 'url(#glow)');
      pg.appendChild(c);
      var lb = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      lb.setAttribute('x', pt.x); lb.setAttribute('y', pt.y + (isMe ? 26 : 22));
      lb.setAttribute('text-anchor', 'middle'); lb.setAttribute('font-family', 'JetBrains Mono');
      lb.setAttribute('font-size', isMe ? '11' : '9'); lb.setAttribute('fill', isMe ? '#fff' : 'var(--text-dim)');
      lb.setAttribute('paint-order', 'stroke'); lb.setAttribute('stroke', 'var(--bg)');
      lb.setAttribute('stroke-width', '3'); lb.textContent = r.name;
      pg.appendChild(lb);
      svg.appendChild(pg);
      playSound('pin');
      container.style.transition = 'transform 0.12s';
      container.style.transform = 'rotate(' + (Math.random() - 0.5) * 1.5 + 'deg)';
      setTimeout(function() { container.style.transform = ''; }, 120);
      var svgRect = container.getBoundingClientRect(); var scale = svgRect.width / W;
      explode(svgRect.left + pt.x * scale, svgRect.top + pt.y * scale, 8, [color], {speed: 3, gravity: 0.2});
    }, 800 + i * 600);
  });
}

// ===================== TUNER DIAL (non-interactive, shows secret number) =====================
function buildTunerDial(number) {
  var container = document.getElementById('tuner-dial-container');
  if (!container) return; container.innerHTML = '';
  var toAngle = function(val) { return ((val - 1) / 9) * 180; };
  var angle = toAngle(number);
  var W = 500, H = 320, cx = 250, cy = 270, R = 210;
  var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  svg.style.width = '100%'; svg.style.maxWidth = '500px';
  var arcPoint = function(a, r) { var rad = (180 - a) * Math.PI / 180; return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) }; };
  var arcPath = function(sA, eA, r) { var s = arcPoint(sA, r), e = arcPoint(eA, r); var la = (eA - sA) > 180 ? 1 : 0; return 'M ' + s.x + ' ' + s.y + ' A ' + r + ' ' + r + ' 0 ' + la + ' 1 ' + e.x + ' ' + e.y; };
  var bg = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  bg.setAttribute('d', arcPath(0, 180, R)); bg.setAttribute('fill', 'none');
  bg.setAttribute('stroke', 'var(--surface-light)'); bg.setAttribute('stroke-width', '36');
  bg.setAttribute('stroke-linecap', 'round'); svg.appendChild(bg);
  var nEnd = arcPoint(angle, R + 5);
  var nl = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  nl.setAttribute('x1', cx); nl.setAttribute('y1', cy);
  nl.setAttribute('x2', nEnd.x); nl.setAttribute('y2', nEnd.y);
  nl.setAttribute('stroke', '#d97bba'); nl.setAttribute('stroke-width', '5');
  nl.setAttribute('stroke-linecap', 'round'); svg.appendChild(nl);
  var cDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  cDot.setAttribute('cx', cx); cDot.setAttribute('cy', cy); cDot.setAttribute('r', '8');
  cDot.setAttribute('fill', '#d97bba'); svg.appendChild(cDot);
  var lL = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  lL.setAttribute('x', cx - R); lL.setAttribute('y', cy + 35);
  lL.setAttribute('font-family', 'JetBrains Mono'); lL.setAttribute('font-size', '14');
  lL.setAttribute('fill', 'var(--accent-cyan)'); lL.setAttribute('font-weight', '700');
  lL.textContent = 'LOW'; svg.appendChild(lL);
  var lR = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  lR.setAttribute('x', cx + R); lR.setAttribute('y', cy + 35);
  lR.setAttribute('font-family', 'JetBrains Mono'); lR.setAttribute('font-size', '14');
  lR.setAttribute('fill', 'var(--accent-pink)'); lR.setAttribute('font-weight', '700');
  lR.textContent = 'HIGH'; svg.appendChild(lR);
  container.appendChild(svg);
}

// ===================== INTERACTIVE GUESS DIAL =====================
let guessDialValue = 50; // 0-100
// FIX: Store listener references for cleanup
let _guessDial_onMove = null;
let _guessDial_onEnd = null;

function buildGuessDial() {
  var wrap = document.getElementById('guess-dial-wrap'); wrap.innerHTML = '';

  // FIX: Remove old document-level listeners before adding new ones
  if (_guessDial_onMove) {
    document.removeEventListener('mousemove', _guessDial_onMove);
    document.removeEventListener('touchmove', _guessDial_onMove);
  }
  if (_guessDial_onEnd) {
    document.removeEventListener('mouseup', _guessDial_onEnd);
    document.removeEventListener('touchend', _guessDial_onEnd);
  }

  var W = 600, H = 360, cx = 300, cy = 310, R = 240;
  var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  svg.style.width = '100%'; svg.style.maxWidth = '600px'; svg.style.touchAction = 'none';

  var arcPoint = function(angle, r) { var rad = (180 - angle) * Math.PI / 180; return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) }; };
  var arcPath = function(sA, eA, r) { var s = arcPoint(sA, r), e = arcPoint(eA, r); var la = (eA - sA) > 180 ? 1 : 0; return 'M ' + s.x + ' ' + s.y + ' A ' + r + ' ' + r + ' 0 ' + la + ' 1 ' + e.x + ' ' + e.y; };

  // Glow filter
  var defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = '<filter id="handleGlow"><feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>';
  svg.appendChild(defs);

  // Background arc
  var bg = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  bg.setAttribute('d', arcPath(0, 180, R)); bg.setAttribute('fill', 'none');
  bg.setAttribute('stroke', 'var(--surface-light)'); bg.setAttribute('stroke-width', '44');
  bg.setAttribute('stroke-linecap', 'round'); svg.appendChild(bg);

  // Color segments
  var colors = [{a:0,c:'#7ecfcf'},{a:45,c:'#7ecfa0'},{a:90,c:'#e8c86e'},{a:135,c:'#d9956b'},{a:180,c:'#d97bba'}];
  for (var i = 0; i < colors.length - 1; i++) {
    var seg = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    seg.setAttribute('d', arcPath(colors[i].a, colors[i+1].a, R)); seg.setAttribute('fill', 'none');
    seg.setAttribute('stroke', colors[i].c); seg.setAttribute('stroke-width', '40');
    seg.setAttribute('opacity', '0.35'); svg.appendChild(seg);
  }

  // Tick marks
  for (var i = 0; i <= 20; i++) {
    var a = i * 9, p1 = arcPoint(a, R + 22), p2 = arcPoint(a, R + 14);
    var tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    tick.setAttribute('x1', p1.x); tick.setAttribute('y1', p1.y);
    tick.setAttribute('x2', p2.x); tick.setAttribute('y2', p2.y);
    tick.setAttribute('stroke', 'var(--text-dim)');
    tick.setAttribute('stroke-width', i % 5 === 0 ? '2.5' : '1');
    tick.setAttribute('opacity', i % 5 === 0 ? '0.6' : '0.3');
    svg.appendChild(tick);
  }

  // Labels
  var lL = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  lL.setAttribute('x', cx - R); lL.setAttribute('y', cy + 40);
  lL.setAttribute('text-anchor', 'middle'); lL.setAttribute('font-family', 'JetBrains Mono');
  lL.setAttribute('font-size', '15'); lL.setAttribute('fill', 'var(--accent-cyan)');
  lL.setAttribute('font-weight', '700'); lL.textContent = 'LOW'; svg.appendChild(lL);
  var lR = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  lR.setAttribute('x', cx + R); lR.setAttribute('y', cy + 40);
  lR.setAttribute('text-anchor', 'middle'); lR.setAttribute('font-family', 'JetBrains Mono');
  lR.setAttribute('font-size', '15'); lR.setAttribute('fill', 'var(--accent-pink)');
  lR.setAttribute('font-weight', '700'); lR.textContent = 'HIGH'; svg.appendChild(lR);

  // Needle + handle
  var needle = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  needle.setAttribute('stroke', 'var(--accent-cyan)'); needle.setAttribute('stroke-width', '4');
  needle.setAttribute('stroke-linecap', 'round'); svg.appendChild(needle);
  var handle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  handle.setAttribute('r', '18'); handle.setAttribute('fill', '#fff');
  handle.setAttribute('stroke', 'var(--accent-cyan)'); handle.setAttribute('stroke-width', '4');
  handle.setAttribute('filter', 'url(#handleGlow)'); handle.style.cursor = 'grab';
  svg.appendChild(handle);
  var cdot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  cdot.setAttribute('cx', cx); cdot.setAttribute('cy', cy); cdot.setAttribute('r', '10');
  cdot.setAttribute('fill', 'var(--accent-cyan)'); svg.appendChild(cdot);
  wrap.appendChild(svg);

  function updateNeedle(pct) {
    var angle = (pct / 100) * 180;
    var pt = arcPoint(angle, R - 20);
    var nEnd = arcPoint(angle, R - 60);
    needle.setAttribute('x1', cx); needle.setAttribute('y1', cy);
    needle.setAttribute('x2', nEnd.x); needle.setAttribute('y2', nEnd.y);
    handle.setAttribute('cx', pt.x); handle.setAttribute('cy', pt.y);
  }
  updateNeedle(guessDialValue);

  // Drag interaction
  var dragging = false;
  function getAngleFromEvent(e) {
    var rect = svg.getBoundingClientRect();
    var scaleX = W / rect.width, scaleY = H / rect.height;
    var px = (e.clientX - rect.left) * scaleX;
    var py = (e.clientY - rect.top) * scaleY;
    var dx = px - cx, dy = cy - py;
    var angle = Math.atan2(dy, dx) * 180 / Math.PI;
    angle = 180 - angle;
    return Math.max(0, Math.min(180, angle));
  }
  function onStart(e) { if (guessLocked) return; dragging = true; handle.style.cursor = 'grabbing'; onMove(e); }
  _guessDial_onMove = function(e) {
    if (!dragging || guessLocked) return;
    e.preventDefault();
    var ev = e.touches ? e.touches[0] : e;
    var angle = getAngleFromEvent(ev);
    guessDialValue = (angle / 180) * 100;
    updateNeedle(guessDialValue);
  };
  _guessDial_onEnd = function() { dragging = false; handle.style.cursor = 'grab'; };

  svg.addEventListener('mousedown', onStart);
  svg.addEventListener('touchstart', onStart, {passive: false});
  document.addEventListener('mousemove', _guessDial_onMove);
  document.addEventListener('touchmove', _guessDial_onMove, {passive: false});
  document.addEventListener('mouseup', _guessDial_onEnd);
  document.addEventListener('touchend', _guessDial_onEnd);
}
