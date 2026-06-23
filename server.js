const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = createServer(app);
const io = new Server(server);
app.use(express.static(path.join(__dirname, 'public')));

const rooms = new Map();

const PROFILE_ICONS = [
  'bear','cat','dog','fox','owl','penguin','rabbit','wolf','octopus','dragon',
  'unicorn','ghost','alien','robot','skull','mushroom','cactus','flame',
  'lightning','moon','sun','star','diamond','crown','sword','shield',
  'potion','crystal','rocket','anchor'
];

const CATEGORIES = [
  'Movies (how good is it?)',
  'Songs (how much of a banger?)',
  'TV Shows (how binge-worthy?)',
  'Foods (how delicious?)',
  'Celebrities (how likeable?)',
  'Video Games (how addicting?)',
  'Fast Food Chains (how much you crave it?)',
  'Desserts (how indulgent?)',
  'Fictional characters (how cool are they?)',
  'Pickup lines (how smooth?)',
  'Excuses for being late (how believable?)',
  'Superpowers (how useful day-to-day?)',
  'Ways to spend a Saturday (how fun?)',
  'First date ideas (how romantic?)',
  'Things to say in an elevator (how awkward?)',
  'Conspiracy theories (how convincing?)',
  'Life skills (how important?)',
  'Things your parents told you (how true?)',
  'Compliments (how flattering?)',
  'Insults from a 5 year old (how devastating?)',
  'Things you Google at 3am (how weird?)',
  'Reasons to call in sick (how creative?)',
  'Things that hit different at night (how real?)',
  'Unpopular opinions (how controversial?)',
  'Red flags in dating (how serious?)',
  'Theme park rides (how terrifying?)',
  'Celebrity baby names (how ridiculous?)',
  'Things you do when nobody is watching (how embarrassing?)',
  'Childhood snacks (how nostalgic?)',
  'Ways to quit your job (how dramatic?)',
  'Historical events (how world-changing?)',
  'Smells (how pleasant?)',
  'Animals as coworkers (how productive?)',
  'Movie villains (how scary?)',
  'Dance moves (how impressive?)',
  'Things teachers say (how passive-aggressive?)',
  'Texts from your mom (how guilt-trippy?)',
  'Ways to start a conversation (how smooth?)',
  'Things you pretend to understand (how confusing?)',
  'Sounds (how satisfying?)',
  'Things in your junk drawer (how useful?)',
  'Niche hobbies (how interesting?)',
  'Foods as weapons (how dangerous?)',
  'Things that shouldnt be competitive but are (how intense?)',
  'Shower thoughts (how profound?)',
  'Reasons the wifi is slow (how likely?)',
  'Things that are overrated (how overhyped?)',
  'Things that are underrated (how slept-on?)',
  'Survival skills (how practical?)',
  'Party tricks (how impressive?)',
];

// FIX: Use iterative approach instead of recursive to avoid stack overflow
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  let attempts = 0;
  do {
    code = '';
    for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
    attempts++;
    if (attempts > 1000) throw new Error('Unable to generate unique room code');
  } while (rooms.has(code));
  return code;
}

function generateNumber() {
  var n;
  do {
    n = Math.round((Math.random() * 7.0 + 1.5) * 10) / 10;
  } while (n >= 3.5 && n <= 6.5 && Math.random() < 0.7);
  return n;
}

function calculateScore(guess, actual) {
  const pct = Math.abs(guess - actual) / 9.0;
  if (pct <= 0.05) return 5;
  if (pct <= 0.10) return 3;
  if (pct <= 0.20) return 1;
  return 0;
}

function calculateTunerScore(guesses, actual) {
  let score = 0;
  for (const guess of guesses) {
    const pct = Math.abs(guess - actual) / 9.0;
    if (pct <= 0.05) score += 2;
    else if (pct <= 0.10) score += 1;
  }
  return score;
}

// FIX: Consistent max players constant
const MAX_PLAYERS = 25;

function getPublicLobbies() {
  const lobbies = [];
  for (const [code, room] of rooms) {
    if (room.state === 'lobby') {
      lobbies.push({
        code: room.code,
        hostName: room.players.find(p => p.isHost)?.name || 'Unknown',
        playerCount: room.players.length,
        maxPlayers: MAX_PLAYERS
      });
    }
  }
  return lobbies;
}

function broadcastLobbies() {
  io.emit('lobbyList', getPublicLobbies());
}

// FIX: Helper to get current tuner by ID (not index) - avoids turnOrder corruption
function getCurrentTuner(room) {
  const tunerId = room.turnOrder[room.currentTurnIndex];
  return room.players.find(p => p.id === tunerId);
}

io.on('connection', (socket) => {
  // Send lobby list on connect
  socket.emit('lobbyList', getPublicLobbies());

  socket.on('createRoom', ({ playerName, icon }) => {
    // FIX: Input validation
    if (!playerName || typeof playerName !== 'string') return socket.emit('error', { message: 'Invalid name' });
    const safeName = playerName.trim().slice(0, 20);
    if (!safeName) return socket.emit('error', { message: 'Name cannot be empty' });
    
    const code = generateRoomCode();
    const room = {
      code, players: [{ id: socket.id, name: safeName, icon: icon||'star', score: 0, isHost: true }],
      settings: { timer: 20, totalRounds: 1 }, state: 'lobby',
      currentRound: 0, currentTurnIndex: 0, turnOrder: [],
      currentCategory: null, currentNumber: null, currentAnswer: null,
      guesses: new Map(), categoryOptions: [], usedCategories: [],
      promptHistory: [], fireReactions: {}
    };
    rooms.set(code, room); socket.join(code); socket.roomCode = code;
    socket.emit('roomCreated', { code, players: room.players, settings: room.settings });
    broadcastLobbies();
  });

  socket.on('joinRoom', ({ code, playerName, icon }) => {
    // FIX: Input validation
    if (!playerName || typeof playerName !== 'string') return socket.emit('error', { message: 'Invalid name' });
    const safeName = playerName.trim().slice(0, 20);
    if (!safeName) return socket.emit('error', { message: 'Name cannot be empty' });
    
    const room = rooms.get(code?.toUpperCase());
    if (!room) return socket.emit('error', { message: 'Room not found' });
    if (room.state !== 'lobby') return socket.emit('error', { message: 'Game already in progress' });
    if (room.players.length >= MAX_PLAYERS) return socket.emit('error', { message: `Room is full (${MAX_PLAYERS} max)` });
    if (room.players.find(p => p.name === safeName)) return socket.emit('error', { message: 'Name already taken' });
    room.players.push({ id: socket.id, name: safeName, icon: icon||'star', score: 0, isHost: false });
    socket.join(code.toUpperCase()); socket.roomCode = code.toUpperCase();
    socket.emit('roomJoined', { code: room.code, players: room.players, settings: room.settings });
    socket.to(room.code).emit('playerJoined', { players: room.players });
    broadcastLobbies();
  });

  socket.on('updateSettings', ({ timer, totalRounds }) => {
    const room = rooms.get(socket.roomCode); if (!room) return;
    const player = room.players.find(p => p.id === socket.id);
    if (!player?.isHost) return;
    if (timer !== undefined) room.settings.timer = Math.max(10, Math.min(60, parseInt(timer) || 20));
    if (totalRounds !== undefined) room.settings.totalRounds = Math.max(1, Math.min(5, parseInt(totalRounds) || 1));
    io.to(room.code).emit('settingsUpdated', { settings: room.settings });
  });

  socket.on('startGame', () => {
    const room = rooms.get(socket.roomCode); if (!room) return;
    const player = room.players.find(p => p.id === socket.id);
    if (!player?.isHost) return;
    if (room.players.length < 3) return socket.emit('error', { message: 'Need at least 3 players' });
    // FIX: Store player IDs in turnOrder instead of indices
    room.turnOrder = room.players.map(p => p.id).sort(() => Math.random()-0.5);
    room.currentRound = 0; room.currentTurnIndex = 0; room.state = 'playing';
    room.usedCategories = []; room.promptHistory = []; room.fireReactions = {};
    room.players.forEach(p => p.score = 0);
    io.to(room.code).emit('gameStarted', { turnOrder: room.turnOrder.map(id => room.players.find(p=>p.id===id)?.name) });
    broadcastLobbies();
    startTurn(room);
  });

  socket.on('selectCategory', ({ category }) => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.state !== 'category') return;
    // FIX: Use ID-based lookup
    const tuner = getCurrentTuner(room);
    if (!tuner || tuner.id !== socket.id) return;
    // FIX: Validate category input
    if (!category || typeof category !== 'string') return;
    const safeCategory = category.trim().slice(0, 500);
    if (!safeCategory) return;
    
    room.currentCategory = safeCategory; room.usedCategories.push(safeCategory);
    room.currentNumber = generateNumber(); room.state = 'answer';
    socket.emit('numberAssigned', { number: room.currentNumber, category: safeCategory });
    socket.to(room.code).emit('tunerChoosing', { category: safeCategory, tunerName: tuner.name });
  });

  socket.on('submitAnswer', ({ answer }) => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.state !== 'answer') return;
    // FIX: Use ID-based lookup
    const tuner = getCurrentTuner(room);
    if (!tuner || tuner.id !== socket.id) return;
    // FIX: Validate answer input
    if (!answer || typeof answer !== 'string') return;
    const safeAnswer = answer.trim().slice(0, 100);
    if (!safeAnswer) return;
    
    room.currentAnswer = safeAnswer; room.state = 'guessing'; room.guesses = new Map();
    // Track prompt history
    room.promptHistory.push({ tuner: tuner.name, category: room.currentCategory, answer: safeAnswer, turnIndex: room.promptHistory.length });
    io.to(room.code).emit('guessPhase', {
      category: room.currentCategory, answer: safeAnswer, tunerName: tuner.name, timer: room.settings.timer,
      promptHistory: room.promptHistory
    });
  });

  socket.on('submitGuess', ({ guess }) => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.state !== 'guessing') return;
    // FIX: Use ID-based lookup for tuner check
    const tuner = getCurrentTuner(room);
    if (!tuner) return;
    if (tuner.id === socket.id) return; // tuner can't guess
    // FIX: Validate guess is a number in range
    const numGuess = parseFloat(guess);
    if (isNaN(numGuess) || numGuess < 1 || numGuess > 10) return;
    // FIX: Prevent duplicate guesses
    if (room.guesses.has(socket.id)) return;
    
    room.guesses.set(socket.id, numGuess);
    const guesserName = room.players.find(p => p.id === socket.id)?.name;
    io.to(room.code).emit('playerGuessed', { name: guesserName, total: room.guesses.size, needed: room.players.length-1 });
    if (room.guesses.size >= room.players.length - 1) doReveal(room);
  });

  socket.on('timerExpired', () => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.state !== 'guessing') return;
    const player = room.players.find(p => p.id === socket.id);
    if (!player?.isHost) return;
    doReveal(room);
  });

  socket.on('fireReaction', ({ turnIndex }) => {
    const room = rooms.get(socket.roomCode); if (!room) return;
    if (!room.fireReactions[turnIndex]) room.fireReactions[turnIndex] = new Set();
    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;
    if (room.fireReactions[turnIndex].has(player.name)) return; // one per person
    room.fireReactions[turnIndex].add(player.name);
    io.to(room.code).emit('fireReactionUpdate', { turnIndex, count: room.fireReactions[turnIndex].size, from: player.name });
  });

  socket.on('nextRound', () => {
    const room = rooms.get(socket.roomCode); if (!room) return;
    const player = room.players.find(p => p.id === socket.id);
    if (!player?.isHost) return;
    // FIX: Guard against advancing when not in reveal state
    if (room.state !== 'reveal') return;
    
    room.currentTurnIndex++;
    // FIX: Use turnOrder length (which is based on IDs) to determine when round ends
    if (room.currentTurnIndex >= room.turnOrder.length) {
      room.currentRound++;
      if (room.currentRound >= room.settings.totalRounds) {
        room.state = 'gameover';
        const finalScores = room.players.map(p => ({ name: p.name, icon: p.icon, score: p.score })).sort((a,b) => b.score-a.score);
        // FIX: Removed fireWinner/maxFires references since they were never computed
        io.to(room.code).emit('gameOver', { scores: finalScores });
        return;
      }
      room.currentTurnIndex = 0;
    }
    // FIX: Skip disconnected players in turn order
    while (room.currentTurnIndex < room.turnOrder.length) {
      const tunerId = room.turnOrder[room.currentTurnIndex];
      if (room.players.find(p => p.id === tunerId)) break; // player still connected
      room.currentTurnIndex++;
    }
    if (room.currentTurnIndex >= room.turnOrder.length) {
      // All remaining turns were disconnected players, advance round
      room.currentRound++;
      if (room.currentRound >= room.settings.totalRounds) {
        room.state = 'gameover';
        const finalScores = room.players.map(p => ({ name: p.name, icon: p.icon, score: p.score })).sort((a,b) => b.score-a.score);
        io.to(room.code).emit('gameOver', { scores: finalScores });
        return;
      }
      room.currentTurnIndex = 0;
      // Skip disconnected at start of new round too
      while (room.currentTurnIndex < room.turnOrder.length) {
        const tunerId = room.turnOrder[room.currentTurnIndex];
        if (room.players.find(p => p.id === tunerId)) break;
        room.currentTurnIndex++;
      }
    }
    startTurn(room);
  });

  socket.on('playAgain', () => {
    const room = rooms.get(socket.roomCode); if (!room) return;
    const player = room.players.find(p => p.id === socket.id);
    if (!player?.isHost) return;
    room.players.forEach(p => p.score = 0);
    room.state = 'lobby'; room.currentRound = 0; room.currentTurnIndex = 0;
    room.usedCategories = []; room.promptHistory = []; room.fireReactions = {};
    io.to(room.code).emit('backToLobby', { players: room.players, settings: room.settings });
    broadcastLobbies();
  });

  
  socket.on('reaction', ({ icon }) => {
    const room = rooms.get(socket.roomCode); if (!room) return;
    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;
    // FIX: Validate icon is one of the known types
    const validIcons = ['heart','laugh','fire','skull','star','lightning'];
    if (!validIcons.includes(icon)) return;
    socket.to(room.code).emit('reactionBroadcast', { icon, from: player.name });
  });

  socket.on('disconnect', () => {
    const room = rooms.get(socket.roomCode); if (!room) return;
    const playerIdx = room.players.findIndex(p => p.id === socket.id);
    if (playerIdx === -1) return;
    const wasHost = room.players[playerIdx].isHost;
    const disconnectedId = room.players[playerIdx].id;
    room.players.splice(playerIdx, 1);
    if (room.players.length === 0) { rooms.delete(socket.roomCode); broadcastLobbies(); return; }
    if (wasHost) { room.players[0].isHost = true; io.to(room.code).emit('hostTransferred', { newHost: room.players[0].name }); }
    io.to(room.code).emit('playerLeft', { players: room.players });
    
    if (room.state !== 'lobby' && room.players.length < 3) {
      room.state = 'lobby';
      io.to(room.code).emit('gameCancelled', { reason: 'Not enough players' });
      broadcastLobbies();
      return;
    }
    
    // FIX: Handle disconnect during guessing phase - if disconnected player was expected to guess
    if (room.state === 'guessing') {
      room.guesses.delete(disconnectedId); // remove any pending guess
      const tuner = getCurrentTuner(room);
      if (tuner) {
        const expectedGuessers = room.players.filter(p => p.id !== tuner.id).length;
        if (room.guesses.size >= expectedGuessers) doReveal(room);
      }
    }
    
    // FIX: Handle disconnect of current tuner mid-turn
    if (room.state === 'category' || room.state === 'answer') {
      const tuner = getCurrentTuner(room);
      if (!tuner) {
        // Current tuner disconnected, skip to next turn
        room.state = 'reveal'; // set to reveal so nextRound handler works
        // Auto-advance (simulate host clicking next)
        room.currentTurnIndex++;
        while (room.currentTurnIndex < room.turnOrder.length) {
          const nextId = room.turnOrder[room.currentTurnIndex];
          if (room.players.find(p => p.id === nextId)) break;
          room.currentTurnIndex++;
        }
        if (room.currentTurnIndex >= room.turnOrder.length) {
          room.currentRound++;
          if (room.currentRound >= room.settings.totalRounds) {
            room.state = 'gameover';
            const finalScores = room.players.map(p => ({ name: p.name, icon: p.icon, score: p.score })).sort((a,b) => b.score-a.score);
            io.to(room.code).emit('gameOver', { scores: finalScores });
            return;
          }
          room.currentTurnIndex = 0;
          while (room.currentTurnIndex < room.turnOrder.length) {
            const nextId = room.turnOrder[room.currentTurnIndex];
            if (room.players.find(p => p.id === nextId)) break;
            room.currentTurnIndex++;
          }
        }
        if (room.players.length >= 3) startTurn(room);
      }
    }
    
    broadcastLobbies();
  });
});

function startTurn(room) {
  // FIX: Use ID-based turnOrder
  const tunerId = room.turnOrder[room.currentTurnIndex];
  const tuner = room.players.find(p => p.id === tunerId);
  if (!tuner) return; // safety check
  
  let available = CATEGORIES.filter(c => !room.usedCategories.includes(c));
  if (available.length < 3) available = [...CATEGORIES];
  const options = available.sort(() => Math.random()-0.5).slice(0, 3);
  room.categoryOptions = options; room.state = 'category';
  room.currentCategory = null; room.currentNumber = null; room.currentAnswer = null; room.guesses = new Map();
  const tunerSocket = io.sockets.sockets.get(tuner.id);
  if (tunerSocket) tunerSocket.emit('yourTurnTuner', { categories: options, roundNumber: room.currentRound+1, turnNumber: room.currentTurnIndex+1, totalTurns: room.turnOrder.length });
  io.to(room.code).emit('newTurn', { tunerName: tuner.name, tunerIcon: tuner.icon, roundNumber: room.currentRound+1, turnNumber: room.currentTurnIndex+1, totalTurns: room.turnOrder.length });
}

function doReveal(room) {
  // FIX: Guard against double-reveal
  if (room.state !== 'guessing') return;
  room.state = 'reveal'; // immediately set state to prevent re-entry
  
  const actual = room.currentNumber;
  // FIX: Use ID-based tuner lookup
  const tuner = getCurrentTuner(room);
  if (!tuner) return;
  
  const results = []; const guessValues = [];
  for (const [socketId, guess] of room.guesses) {
    const player = room.players.find(p => p.id === socketId);
    if (!player) continue;
    const points = calculateScore(guess, actual);
    player.score += points; guessValues.push(guess);
    results.push({ name: player.name, icon: player.icon, guess, points });
  }
  const tunerPoints = calculateTunerScore(guessValues, actual);
  tuner.score += tunerPoints;
  const nonGuessers = room.players.filter(p => p.id !== tuner.id && !room.guesses.has(p.id));
  for (const p of nonGuessers) results.push({ name: p.name, icon: p.icon, guess: null, points: 0 });
  
  // FIX: Determine if this is the last turn properly
  const isLastTurn = room.currentTurnIndex >= room.turnOrder.length-1 && room.currentRound >= room.settings.totalRounds-1;
  
  io.to(room.code).emit('reveal', {
    actual, category: room.currentCategory, answer: room.currentAnswer,
    tunerName: tuner.name, tunerIcon: tuner.icon, tunerPoints,
    results: results.sort((a,b) => b.points-a.points),
    scores: room.players.map(p => ({ name: p.name, icon: p.icon, score: p.score })).sort((a,b) => b.score-a.score),
    isLastTurn
  });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => { console.log(`Wavelength running on port ${PORT}`); });
