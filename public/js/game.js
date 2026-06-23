// game.js - Socket.IO, game flow, screens, controls

const socket = io();

let myName = '', myIcon = 'star', isHost = false, isTuner = false;
let currentTimer = null, timerDuration = 20, guessLocked = false;

// ===================== ICON PICKER =====================
(function initIconPicker() {
  var iconPicker = document.getElementById('icon-picker');
  ICON_NAMES.forEach(function(name) {
    var opt = document.createElement('div');
    opt.className = 'icon-option' + (name === 'star' ? ' selected' : '');
    opt.innerHTML = '<svg viewBox="0 0 32 32"><use href="#ico-' + name + '"/></svg>';
    opt.addEventListener('click', function() {
      iconPicker.querySelectorAll('.icon-option').forEach(function(o) { o.classList.remove('selected'); });
      opt.classList.add('selected'); myIcon = name; playSound('select');
      sparkle(opt.getBoundingClientRect().left + 20, opt.getBoundingClientRect().top + 20, 8);
    });
    iconPicker.appendChild(opt);
  });
})();

// ===================== JOIN / CREATE =====================
var btnCreate = document.getElementById('btn-create'), btnJoin = document.getElementById('btn-join');
var inputName = document.getElementById('input-name'), inputCode = document.getElementById('input-code');
var urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('room')) inputCode.value = urlParams.get('room');

btnCreate.addEventListener('click', function() {
  var n = inputName.value.trim();
  if (!n) return showToast('Enter your name');
  myName = n; socket.emit('createRoom', { playerName: n, icon: myIcon }); playSound('select');
});
btnJoin.addEventListener('click', function() {
  var n = inputName.value.trim(), c = inputCode.value.trim().toUpperCase();
  if (!n) return showToast('Enter your name');
  if (!c) return showToast('Enter a room code');
  myName = n; socket.emit('joinRoom', { code: c, playerName: n, icon: myIcon }); playSound('select');
});
inputCode.addEventListener('keyup', function(e) { if (e.key === 'Enter') btnJoin.click(); });
inputName.addEventListener('keyup', function(e) { if (e.key === 'Enter') { inputCode.value ? btnJoin.click() : btnCreate.click(); } });

// ===================== LOBBY LIST =====================
socket.on('lobbyList', function(lobbies) {
  var container = document.getElementById('lobby-list-container');
  if (!container) return;
  if (lobbies.length === 0) { container.innerHTML = ''; return; }
  var html = '<h3 style="text-align:center;margin-bottom:12px;">Open Rooms</h3>';
  lobbies.forEach(function(lobby) {
    html += '<div style="background:var(--surface);border:2px solid var(--surface-light);border-radius:var(--radius);padding:14px 18px;margin-bottom:8px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;transition:all 0.2s;" onclick="joinLobbyRoom(\'' + esc(lobby.code) + '\')">' +
      '<div><span style="font-family:var(--font-mono);font-weight:700;color:var(--accent-yellow);">' + esc(lobby.code) + '</span> <span style="color:var(--text-dim);margin-left:8px;">' + esc(lobby.hostName) + '\'s room</span></div>' +
      '<span style="font-family:var(--font-mono);color:var(--accent-green);">' + lobby.playerCount + '/25</span></div>';
  });
  container.innerHTML = html;
});

function joinLobbyRoom(code) {
  var n = document.getElementById('input-name').value.trim();
  if (!n) return showToast('Enter your name first');
  myName = n; socket.emit('joinRoom', { code: code, playerName: n, icon: myIcon }); playSound('select');
}

// ===================== LOBBY =====================
socket.on('roomCreated', function(data) { isHost = true; setupLobby(data.code, data.players, data.settings); });
socket.on('roomJoined', function(data) { isHost = false; setupLobby(data.code, data.players, data.settings); });

function setupLobby(code, players, settings) {
  showScreen('screen-lobby');
  document.getElementById('lobby-code').textContent = code;
  var link = window.location.origin + window.location.pathname + '?room=' + code;
  var linkEl = document.getElementById('lobby-link');
  linkEl.textContent = link;
  linkEl.onclick = function() { navigator.clipboard.writeText(link); showToast('Link copied!'); playSound('select'); };
  renderPlayers(players);
  document.getElementById('lobby-settings').style.display = isHost ? 'flex' : 'none';
  document.getElementById('btn-start').style.display = isHost ? 'inline-block' : 'none';
  document.getElementById('lobby-wait').style.display = isHost ? 'none' : 'block';
  document.getElementById('setting-timer').value = settings.timer;
  document.getElementById('setting-rounds').value = settings.totalRounds;
}

function renderPlayers(players) {
  var c = document.getElementById('lobby-players'); c.innerHTML = '';
  players.forEach(function(p, i) {
    var chip = document.createElement('div');
    chip.className = 'player-chip' + (p.isHost ? ' host' : '');
    chip.style.animationDelay = (i * 0.05) + 's';
    chip.innerHTML = getIconSVG(p.icon || 'star') + esc(p.name) + (p.isHost ? '<span class="host-badge">HOST</span>' : '');
    c.appendChild(chip);
  });
}

socket.on('playerJoined', function(data) { renderPlayers(data.players); playSound('join'); explodeConfetti(window.innerWidth / 2, window.innerHeight / 2, 20); });
socket.on('playerLeft', function(data) { renderPlayers(data.players); });
socket.on('settingsUpdated', function(data) { document.getElementById('setting-timer').value = data.settings.timer; document.getElementById('setting-rounds').value = data.settings.totalRounds; });
socket.on('hostTransferred', function(data) {
  if (data.newHost === myName) {
    isHost = true;
    document.getElementById('lobby-settings').style.display = 'flex';
    document.getElementById('btn-start').style.display = 'inline-block';
    document.getElementById('lobby-wait').style.display = 'none';
    showToast('You are now the host!');
  }
});

document.getElementById('setting-timer').addEventListener('change', function(e) { socket.emit('updateSettings', { timer: parseInt(e.target.value) }); });
document.getElementById('setting-rounds').addEventListener('change', function(e) { socket.emit('updateSettings', { totalRounds: parseInt(e.target.value) }); });
document.getElementById('btn-start').addEventListener('click', function() { socket.emit('startGame'); playSound('score'); });

// ===================== GAME FLOW =====================
socket.on('gameStarted', function() { playSound('score'); explodeConfetti(window.innerWidth / 2, window.innerHeight / 2, 60); });

socket.on('newTurn', function(data) {
  if (data.tunerName === myName) return;
  isTuner = false; showScreen('screen-waiting');
  document.getElementById('waiting-title').textContent = data.tunerName + ' is the Tuner';
  document.getElementById('waiting-subtitle').textContent = 'Choosing a category... (Turn ' + data.turnNumber + '/' + data.totalTurns + ')';
});

socket.on('yourTurnTuner', function(data) {
  isTuner = true; showScreen('screen-category'); playSound('reveal');
  explodeConfetti(window.innerWidth / 2, 150, 30);
  var grid = document.getElementById('category-options'); grid.innerHTML = '';
  data.categories.forEach(function(cat) {
    var btn = document.createElement('button'); btn.className = 'category-btn';
    btn.textContent = cat;
    btn.addEventListener('click', function() { socket.emit('selectCategory', { category: cat }); playSound('lock'); switchBgIcons(cat); });
    grid.appendChild(btn);
  });
});

document.getElementById('btn-custom-cat').addEventListener('click', function() {
  var v = document.getElementById('input-custom-cat').value.trim();
  if (!v) return showToast('Type a category');
  socket.emit('selectCategory', { category: v }); playSound('lock'); switchBgIcons(v);
});
document.getElementById('input-custom-cat').addEventListener('keyup', function(e) { if (e.key === 'Enter') document.getElementById('btn-custom-cat').click(); });

socket.on('numberAssigned', function(data) {
  showScreen('screen-answer');
  document.getElementById('answer-category-label').textContent = data.category;
  document.getElementById('answer-number').textContent = data.number.toFixed(1);
  buildTunerDial(data.number);
  document.getElementById('input-answer').value = '';
  document.getElementById('input-answer').focus();
  playSound('reveal');
  setTimeout(function() {
    var el = document.getElementById('tuner-dial-container');
    if (el) { var r = el.getBoundingClientRect(); explodeConfetti(r.left + r.width / 2, r.top + r.height / 2, 40); }
  }, 100);
});

socket.on('tunerChoosing', function(data) {
  if (isTuner) return;
  document.getElementById('waiting-title').textContent = data.tunerName + ' got their number';
  document.getElementById('waiting-subtitle').textContent = 'Category: ' + data.category;
  playSound('dot'); switchBgIcons(data.category);
});

document.getElementById('btn-submit-answer').addEventListener('click', function() {
  var a = document.getElementById('input-answer').value.trim();
  if (!a) return showToast('Type an answer');
  socket.emit('submitAnswer', { answer: a }); playSound('lock');
  explodeConfetti(window.innerWidth / 2, window.innerHeight / 2, 20);
});
document.getElementById('input-answer').addEventListener('keyup', function(e) { if (e.key === 'Enter') document.getElementById('btn-submit-answer').click(); });

// ===================== GUESS PHASE =====================
socket.on('guessPhase', function(data) {
  guessLocked = false; timerDuration = data.timer; guessDialValue = 50;
  if (isTuner) {
    showScreen('screen-waiting');
    document.getElementById('waiting-title').textContent = 'Everyone is guessing...';
    document.getElementById('waiting-subtitle').textContent = 'You said "' + data.answer + '" for ' + data.category;
    return;
  }
  showScreen('screen-guess');
  document.getElementById('guess-tuner-name').textContent = data.tunerName;
  document.getElementById('guess-category').textContent = data.category;
  switchBgIcons(data.category);
  document.getElementById('guess-answer').textContent = data.answer;
  document.getElementById('btn-submit-guess').disabled = false;
  document.getElementById('btn-submit-guess').textContent = 'LOCK IN GUESS';
  document.getElementById('guess-status').innerHTML = '';
  buildGuessDial();
  playSound('reveal'); startTimer(data.timer);
});

document.getElementById('btn-submit-guess').addEventListener('click', function() {
  if (guessLocked) return; guessLocked = true;
  var guess = 1 + (guessDialValue / 100) * 9;
  socket.emit('submitGuess', { guess: guess });
  document.getElementById('btn-submit-guess').disabled = true;
  document.getElementById('btn-submit-guess').textContent = 'LOCKED IN';
  playSound('lock'); explodeConfetti(window.innerWidth / 2, window.innerHeight - 100, 25);
});

socket.on('playerGuessed', function(data) {
  var status = document.getElementById('guess-status');
  var chip = status.querySelector('[data-name="' + CSS.escape(data.name) + '"]');
  if (!chip) {
    chip = document.createElement('span'); chip.className = 'status-chip done';
    chip.dataset.name = data.name; chip.textContent = data.name;
    status.appendChild(chip); playSound('dot');
  }
});

function startTimer(duration) {
  if (currentTimer) clearInterval(currentTimer);
  var remaining = duration;
  var circle = document.getElementById('timer-circle'), text = document.getElementById('timer-text');
  circle.style.strokeDashoffset = '0'; circle.style.stroke = 'var(--accent-cyan)';
  text.textContent = remaining;
  currentTimer = setInterval(function() {
    remaining--;
    text.textContent = remaining;
    circle.style.strokeDashoffset = 220 * (1 - remaining / duration);
    if (remaining <= 5) { circle.style.stroke = 'var(--accent-magenta)'; playSound('countdown'); }
    if (remaining <= 0) {
      clearInterval(currentTimer); currentTimer = null;
      if (!guessLocked && !isTuner) {
        guessLocked = true;
        var g = 1 + (guessDialValue / 100) * 9;
        socket.emit('submitGuess', { guess: g });
      }
      if (isHost) socket.emit('timerExpired');
    }
  }, 1000);
}

// ===================== REVEAL =====================
socket.on('reveal', function(data) {
  if (currentTimer) { clearInterval(currentTimer); currentTimer = null; }
  showScreen('screen-reveal'); playSound('reveal');
  document.getElementById('reveal-category').textContent = data.category;
  document.getElementById('reveal-answer').textContent = data.answer;
  document.getElementById('reveal-number').textContent = '';
  buildDial(data.actual, data.results, myName);

  var resultsList = document.getElementById('reveal-results'); resultsList.innerHTML = '';
  var revealDelay = 800 + data.results.length * 600 + 400;

  data.results.forEach(function(r, i) {
    setTimeout(function() {
      var row = document.createElement('div');
      row.className = 'result-row' + (r.name === myName ? ' wonky' : '');
      row.style.animationDelay = (i * 0.08) + 's';
      if (r.name === myName) row.style.border = '2px solid var(--accent-yellow)';
      var ptsClass = r.points >= 5 ? 'p5' : r.points >= 3 ? 'p3' : r.points >= 1 ? 'p1' : 'p0';
      row.innerHTML = getIconSVG(r.icon || 'star', 28) +
        '<span class="name">' + esc(r.name) + (r.name === myName ? ' (you)' : '') + '</span>' +
        '<span class="guess-val">' + (r.guess !== null ? '\u2022' : '-') + '</span>' +
        '<span class="pts ' + ptsClass + '">+' + r.points + '</span>';
      resultsList.appendChild(row); playSound('dot');
    }, revealDelay + i * 120);
  });

  setTimeout(function() {
    document.getElementById('reveal-tuner-score').textContent = data.tunerName + ' (Tuner) +' + data.tunerPoints;
    if (data.tunerPoints > 0) { playSound('score'); explodeConfetti(window.innerWidth / 2, window.innerHeight - 200, 30); }
  }, revealDelay + data.results.length * 120 + 300);

  setTimeout(function() {
    var existingLb = document.querySelector('#screen-reveal .scoreboard');
    if (existingLb) existingLb.remove();
    var lb = document.createElement('div'); lb.className = 'scoreboard'; lb.style.marginTop = '16px';
    lb.innerHTML = '<h3 style="text-align:center;margin-bottom:8px;" class="wonky-2">Leaderboard</h3>';
    data.scores.forEach(function(s, i) {
      var row = document.createElement('div'); row.className = 'score-row';
      row.style.animationDelay = (i * 0.08) + 's';
      var rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
      var isUser = s.name === myName;
      if (isUser) row.style.background = 'rgba(232,200,110,0.08)';
      row.innerHTML = '<span class="rank ' + rankClass + '">#' + (i + 1) + '</span>' +
        getIconSVG(s.icon || 'star', 28) +
        '<span class="name">' + esc(s.name) + (isUser ? ' (you)' : '') + '</span>' +
        '<span class="points">' + s.score + '</span>';
      lb.appendChild(row);
    });
    resultsList.after(lb);
  }, revealDelay + data.results.length * 120 + 600);

  setTimeout(function() {
    if (isHost) {
      if (data.isLastTurn) {
        document.getElementById('btn-final-scores').style.display = 'inline-block';
        document.getElementById('btn-next-round').style.display = 'none';
      } else {
        document.getElementById('btn-next-round').style.display = 'inline-block';
        document.getElementById('btn-final-scores').style.display = 'none';
      }
    }
  }, revealDelay + data.results.length * 120 + 900);
});

document.getElementById('btn-next-round').addEventListener('click', function() {
  document.getElementById('btn-next-round').style.display = 'none';
  socket.emit('nextRound'); playSound('select');
});
document.getElementById('btn-final-scores').addEventListener('click', function() {
  document.getElementById('btn-final-scores').style.display = 'none';
  socket.emit('nextRound'); playSound('select');
});

// ===================== GAME OVER =====================
// FIX: Removed fireWinner/maxFires references (server no longer sends them)
socket.on('gameOver', function(data) {
  showScreen('screen-gameover'); playSound('gameover');
  setTimeout(function() {
    for (var i = 0; i < 6; i++) {
      setTimeout(function() { explodeConfetti(Math.random() * window.innerWidth, Math.random() * window.innerHeight * 0.5, 50); }, i * 250);
    }
  }, 200);
  var winText = data.scores[0].name + ' wins!';
  document.getElementById('winner-text').textContent = winText;
  var board = document.getElementById('final-scoreboard'); board.innerHTML = '';
  data.scores.forEach(function(s, i) {
    var row = document.createElement('div'); row.className = 'score-row';
    row.style.animationDelay = (i * 0.12) + 's';
    var rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
    var isUser = s.name === myName;
    if (isUser) row.style.background = 'rgba(232,200,110,0.08)';
    row.innerHTML = '<span class="rank ' + rankClass + '">#' + (i + 1) + '</span>' +
      getIconSVG(s.icon || 'star', 32) +
      '<span class="name">' + esc(s.name) + (isUser ? ' (you)' : '') + '</span>' +
      '<span class="points">' + s.score + '</span>';
    board.appendChild(row);
  });
  if (isHost) document.getElementById('btn-play-again').style.display = 'inline-block';
});

document.getElementById('btn-play-again').addEventListener('click', function() { socket.emit('playAgain'); playSound('select'); });
socket.on('backToLobby', function(data) {
  setupLobby(document.getElementById('lobby-code').textContent, data.players, data.settings);
  document.getElementById('btn-play-again').style.display = 'none';
});

// ===================== ERROR / DISCONNECT =====================
socket.on('error', function(data) { showToast(data.message); });
socket.on('gameCancelled', function(data) { showToast('Game ended: ' + data.reason); showScreen('screen-lobby'); });
socket.on('disconnect', function() { showToast('Disconnected'); });

// ===================== REACTIONS (socket) =====================
socket.on('reactionBroadcast', function(data) {
  var r = REACTIONS.find(function(rx) { return rx.name === data.icon; }) || REACTIONS[0];
  floatReaction(r);
});

// ===================== INIT CREATURES ON FIRST CLICK =====================
let monkeyTimer = 0;
setInterval(function() { if (dogInstance && dogInstance.showQuip) dogInstance.showQuip(); }, 45000);
setInterval(function() {
  monkeyTimer++;
  if (monkeyTimer > 0 && !monkeyActive && Math.random() < 0.3) {
    monkeyActive = true; new Monkey(); monkeyTimer = 0;
  }
}, 20000);

document.addEventListener('click', function() {
  if (!musicPlaying) startMusic();
  for (var i = 0; i < 4; i++) { (function(idx) { setTimeout(function() { new PixelBird(idx); }, idx * 1500); })(i); }
  dogInstance = new PixelDog();
  initReactionPanel();
}, { once: true });

// ===================== CONTROLS =====================
(function setupControls() {
  var musicSlider = document.getElementById('ctrl-music');
  var sfxSlider = document.getElementById('ctrl-sfx');
  var themeBtn = document.getElementById('ctrl-theme');

  if (musicSlider) {
    musicSlider.addEventListener('input', function(e) {
      var vol = e.target.value / 100;
      if (bgMusic) { bgMusic.volume = vol; if (vol > 0 && bgMusic.paused) bgMusic.play().catch(function() {}); }
      if (!musicPlaying && vol > 0) startMusic();
    });
  }
  if (sfxSlider) {
    sfxSlider.addEventListener('input', function(e) {
      initAudio();
      if (sfxGain) sfxGain.gain.value = e.target.value / 100;
    });
  }
  if (themeBtn) {
    themeBtn.addEventListener('click', function() {
      var html = document.documentElement;
      var current = html.getAttribute('data-theme');
      html.setAttribute('data-theme', current === 'dark' ? 'light' : 'dark');
    });
  }
})();
