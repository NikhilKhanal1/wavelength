// utils.js - Shared utilities and constants

const PALETTE = ['#7ecfcf','#d97bba','#e8c86e','#7ecfa0','#d9956b','#a07edb','#7ea8db','#db7e9e','#ff6b6b','#feca57','#48dbfb','#ff9ff3'];
const BRIGHT_PALETTE = ['#7ecfcf','#e8c86e','#ff6b6b','#feca57','#48dbfb','#ff9ff3','#7ecfa0','#a07edb'];
const ICON_NAMES = ['bear','cat','dog','fox','owl','penguin','rabbit','wolf','octopus','dragon','unicorn','ghost','alien','robot','skull','mushroom','cactus','flame','lightning','moon','sun','star','diamond','crown','sword','shield','potion','crystal','rocket','anchor'];

// XSS-safe HTML escaping
function esc(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

function getIconSVG(name, size) {
  size = size || 24;
  return '<svg width="' + size + '" height="' + size + '" class="player-icon"><use href="#ico-' + esc(name) + '"/></svg>';
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(function(s) { s.classList.remove('active'); });
  var screen = document.getElementById(id);
  if (screen) {
    screen.classList.add('active');
    screen.style.animation = 'none';
    screen.offsetHeight; // force reflow
    screen.style.animation = '';
  }
  playSound('whoosh');
}

function showToast(msg) {
  var existing = document.querySelector('.toast');
  if (existing) existing.remove();
  var t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(function() { t.remove(); }, 3000);
}
