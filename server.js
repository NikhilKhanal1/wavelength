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
  'Movies (how good is it?)','Songs (how much of a banger?)','TV Shows (how binge-worthy?)',
  'Foods (how delicious?)','Restaurants (how fancy?)','Celebrities (how likeable?)',
  'Cities (how fun to visit?)','Video Games (how addicting?)','Albums (how front-to-back listenable?)',
  'Athletes (how dominant in their sport?)','Snacks (how hard to stop eating?)',
  'Fast Food Chains (how much you crave it?)','Candy Bars (how satisfying?)',
  'Drinks (how refreshing?)','Pizza Toppings (how essential?)','Ice Cream Flavors (how elite?)',
  'Desserts (how indulgent?)','Cartoons (how nostalgic?)','Disney Movies (how rewatchable?)',
  'Superheroes (how cool their powers are?)','Cars (how badly you want one?)',
  'Vacation Spots (how relaxing?)','Hobbies (how fun to do?)','School Subjects (how interesting?)',
  'Apps (how addicting?)','Board Games (how fun with friends?)','Cocktails (how smooth?)',
  'Coffee Drinks (how necessary in the morning?)','Dog Breeds (how cuddly?)',
  'Comedians (how funny?)','Sandwiches (how perfect for lunch?)','Theme Parks (how worth the ticket price?)',
  'Podcasts (how easy to binge?)','YouTube Channels (how entertaining?)',
  'Shoes (how comfortable?)','Musical Artists (how talented?)','Books (how hard to put down?)',
  'Inventions (how world-changing?)','Countries (how bucket-list worthy?)',
  'Holidays (how much you look forward to it?)','Sports (how exciting to watch?)',
  'Animals (how cool as a pet?)','Instruments (how impressive to play?)'
];

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return rooms.has(code) ? generateRoomCode() : code;
}

function generateNumber() { return Math.round((Math.random() * 7.0 + 1.5) * 10) / 10; }

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

io.on('connection', (socket) => {
  socket.on('createRoom', ({ playerName, icon }) => {
    const code = generateRoomCode();
    const room = {
      code, players: [{ id: socket.id, name: playerName, icon: icon||'star', score: 0, isHost: true }],
      settings: { timer: 20, totalRounds: 1 }, state: 'lobby',
      currentRound: 0, currentTurnIndex: 0, turnOrder: [],
      currentCategory: null, currentNumber: null, currentAnswer: null,
      guesses: new Map(), categoryOptions: [], usedCategories: [],
      promptHistory: [], fireReactions: {}
    };
    rooms.set(code, room); socket.join(code); socket.roomCode = code;
    socket.emit('roomCreated', { code, players: room.players, settings: room.settings });
  });

  socket.on('joinRoom', ({ code, playerName, icon }) => {
    const room = rooms.get(code?.toUpperCase());
    if (!room) return socket.emit('error', { message: 'Room not found' });
    if (room.state !== 'lobby') return socket.emit('error', { message: 'Game already in progress' });
    if (room.players.find(p => p.name === playerName)) return socket.emit('error', { message: 'Name already taken' });
    room.players.push({ id: socket.id, name: playerName, icon: icon||'star', score: 0, isHost: false });
    socket.join(code.toUpperCase()); socket.roomCode = code.toUpperCase();
    socket.emit('roomJoined', { code: room.code, players: room.players, settings: room.settings });
    socket.to(room.code).emit('playerJoined', { players: room.players });
  });

  socket.on('updateSettings', ({ timer, totalRounds }) => {
    const room = rooms.get(socket.roomCode); if (!room) return;
    const player = room.players.find(p => p.id === socket.id);
    if (!player?.isHost) return;
    if (timer !== undefined) room.settings.timer = timer;
    if (totalRounds !== undefined) room.settings.totalRounds = totalRounds;
    io.to(room.code).emit('settingsUpdated', { settings: room.settings });
  });

  socket.on('startGame', () => {
    const room = rooms.get(socket.roomCode); if (!room) return;
    const player = room.players.find(p => p.id === socket.id);
    if (!player?.isHost) return;
    if (room.players.length < 3) return socket.emit('error', { message: 'Need at least 3 players' });
    room.turnOrder = room.players.map((_,i) => i).sort(() => Math.random()-0.5);
    room.currentRound = 0; room.currentTurnIndex = 0; room.state = 'playing';
    room.usedCategories = []; room.promptHistory = []; room.fireReactions = {};
    io.to(room.code).emit('gameStarted', { turnOrder: room.turnOrder.map(i => room.players[i].name) });
    startTurn(room);
  });

  socket.on('selectCategory', ({ category }) => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.state !== 'category') return;
    const tunerIdx = room.turnOrder[room.currentTurnIndex];
    if (room.players[tunerIdx].id !== socket.id) return;
    room.currentCategory = category; room.usedCategories.push(category);
    room.currentNumber = generateNumber(); room.state = 'answer';
    socket.emit('numberAssigned', { number: room.currentNumber, category });
    socket.to(room.code).emit('tunerChoosing', { category, tunerName: room.players[tunerIdx].name });
  });

  socket.on('submitAnswer', ({ answer }) => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.state !== 'answer') return;
    const tunerIdx = room.turnOrder[room.currentTurnIndex];
    if (room.players[tunerIdx].id !== socket.id) return;
    room.currentAnswer = answer; room.state = 'guessing'; room.guesses = new Map();
    // Track prompt history
    room.promptHistory.push({ tuner: room.players[tunerIdx].name, category: room.currentCategory, answer, turnIndex: room.promptHistory.length });
    io.to(room.code).emit('guessPhase', {
      category: room.currentCategory, answer, tunerName: room.players[tunerIdx].name, timer: room.settings.timer,
      promptHistory: room.promptHistory
    });
  });

  socket.on('submitGuess', ({ guess }) => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.state !== 'guessing') return;
    const tunerIdx = room.turnOrder[room.currentTurnIndex];
    if (room.players[tunerIdx].id === socket.id) return;
    room.guesses.set(socket.id, guess);
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
    room.currentTurnIndex++;
    if (room.currentTurnIndex >= room.players.length) {
      room.currentRound++;
      if (room.currentRound >= room.settings.totalRounds) {
        room.state = 'gameover';
        // Award +5 to most fire-reacted prompt
        let maxFires = 0, fireWinner = null;
        for (const [idx, reactors] of Object.entries(room.fireReactions)) {
          if (reactors.size > maxFires) { maxFires = reactors.size; fireWinner = room.promptHistory[idx]?.tuner; }
        }
        if (fireWinner && maxFires > 0) {
          const p = room.players.find(pl => pl.name === fireWinner);
          if (p) p.score += 5;
        }
        const finalScores = room.players.map(p => ({ name: p.name, icon: p.icon, score: p.score })).sort((a,b) => b.score-a.score);
        io.to(room.code).emit('gameOver', { scores: finalScores, fireWinner, maxFires });
        return;
      }
      room.currentTurnIndex = 0;
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
  });

  socket.on('disconnect', () => {
    const room = rooms.get(socket.roomCode); if (!room) return;
    const playerIdx = room.players.findIndex(p => p.id === socket.id);
    if (playerIdx === -1) return;
    const wasHost = room.players[playerIdx].isHost;
    room.players.splice(playerIdx, 1);
    if (room.players.length === 0) { rooms.delete(socket.roomCode); return; }
    if (wasHost) { room.players[0].isHost = true; io.to(room.code).emit('hostTransferred', { newHost: room.players[0].name }); }
    io.to(room.code).emit('playerLeft', { players: room.players });
    if (room.state !== 'lobby' && room.players.length < 3) { room.state = 'lobby'; io.to(room.code).emit('gameCancelled', { reason: 'Not enough players' }); }
  });
});

function startTurn(room) {
  const tunerIdx = room.turnOrder[room.currentTurnIndex];
  const tuner = room.players[tunerIdx];
  let available = CATEGORIES.filter(c => !room.usedCategories.includes(c));
  if (available.length < 3) available = [...CATEGORIES];
  const options = available.sort(() => Math.random()-0.5).slice(0, 3);
  room.categoryOptions = options; room.state = 'category';
  room.currentCategory = null; room.currentNumber = null; room.currentAnswer = null; room.guesses = new Map();
  const tunerSocket = io.sockets.sockets.get(tuner.id);
  if (tunerSocket) tunerSocket.emit('yourTurnTuner', { categories: options, roundNumber: room.currentRound+1, turnNumber: room.currentTurnIndex+1, totalTurns: room.players.length });
  io.to(room.code).emit('newTurn', { tunerName: tuner.name, tunerIcon: tuner.icon, roundNumber: room.currentRound+1, turnNumber: room.currentTurnIndex+1, totalTurns: room.players.length });
}

function doReveal(room) {
  room.state = 'reveal';
  const actual = room.currentNumber;
  const tunerIdx = room.turnOrder[room.currentTurnIndex];
  const tuner = room.players[tunerIdx];
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
  io.to(room.code).emit('reveal', {
    actual, category: room.currentCategory, answer: room.currentAnswer,
    tunerName: tuner.name, tunerIcon: tuner.icon, tunerPoints,
    results: results.sort((a,b) => b.points-a.points),
    scores: room.players.map(p => ({ name: p.name, icon: p.icon, score: p.score })).sort((a,b) => b.score-a.score),
    isLastTurn: room.currentTurnIndex >= room.players.length-1 && room.currentRound >= room.settings.totalRounds-1
  });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => { console.log(`Wavelength running on port ${PORT}`); });
