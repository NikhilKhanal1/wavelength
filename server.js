const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// Room storage
const rooms = new Map();

// Category bank
const CATEGORIES = [
  'Movies', 'TV Shows', 'Songs', 'Albums', 'Musical Artists',
  'Video Games', 'Board Games', 'Books', 'Foods', 'Restaurants',
  'Candy Bars', 'Drinks', 'Sports', 'Athletes', 'Cities',
  'Countries', 'Vacation Destinations', 'Cars', 'Celebrities',
  'Superheroes', 'Villains', 'Animals', 'Dog Breeds', 'Holidays',
  'School Subjects', 'Careers', 'Websites', 'Apps', 'Inventions',
  'Pizza Toppings', 'Ice Cream Flavors', 'Snacks', 'Fast Food Chains',
  'Disney Movies', 'Marvel Characters', 'Reality TV Shows', 'Podcasts',
  'YouTube Channels', 'Memes', 'Cocktails', 'Coffee Drinks',
  'Shoes', 'Clothing Brands', 'Hobbies', 'Desserts', 'Cartoons',
  'Comedians', 'Museums', 'Theme Parks', 'Sandwiches'
];

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return rooms.has(code) ? generateRoomCode() : code;
}

function getRandomCategories(count = 3) {
  const shuffled = [...CATEGORIES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function generateNumber() {
  // Random value 1.0 - 10.0, one decimal place, avoid extremes
  return Math.round((Math.random() * 7.0 + 1.5) * 10) / 10;
}

function calculateScore(guess, actual) {
  const distance = Math.abs(guess - actual);
  const range = 9.0; // 10 - 1
  const pct = distance / range;
  if (pct <= 0.05) return 5;
  if (pct <= 0.10) return 3;
  if (pct <= 0.20) return 1;
  return 0;
}

function calculateTunerScore(guesses, actual) {
  let score = 0;
  for (const guess of guesses) {
    const distance = Math.abs(guess - actual);
    const pct = distance / 9.0;
    if (pct <= 0.05) score += 2;
    else if (pct <= 0.10) score += 1;
  }
  return score;
}

io.on('connection', (socket) => {
  console.log(`Connected: ${socket.id}`);

  socket.on('createRoom', ({ playerName }) => {
    const code = generateRoomCode();
    const room = {
      code,
      players: [{
        id: socket.id,
        name: playerName,
        score: 0,
        isHost: true
      }],
      settings: { timer: 20, totalRounds: 1 },
      state: 'lobby',
      currentRound: 0,
      currentTurnIndex: 0,
      turnOrder: [],
      currentCategory: null,
      currentNumber: null,
      currentAnswer: null,
      guesses: new Map(),
      categoryOptions: [],
      usedCategories: []
    };
    rooms.set(code, room);
    socket.join(code);
    socket.roomCode = code;
    socket.emit('roomCreated', { code, players: room.players, settings: room.settings });
  });

  socket.on('joinRoom', ({ code, playerName }) => {
    const room = rooms.get(code?.toUpperCase());
    if (!room) return socket.emit('error', { message: 'Room not found' });
    if (room.state !== 'lobby') return socket.emit('error', { message: 'Game already in progress' });
    if (room.players.find(p => p.name === playerName)) return socket.emit('error', { message: 'Name already taken' });

    room.players.push({ id: socket.id, name: playerName, score: 0, isHost: false });
    socket.join(code.toUpperCase());
    socket.roomCode = code.toUpperCase();
    socket.emit('roomJoined', { code: room.code, players: room.players, settings: room.settings });
    socket.to(room.code).emit('playerJoined', { players: room.players });
  });

  socket.on('updateSettings', ({ timer, totalRounds }) => {
    const room = rooms.get(socket.roomCode);
    if (!room) return;
    const player = room.players.find(p => p.id === socket.id);
    if (!player?.isHost) return;
    if (timer !== undefined) room.settings.timer = timer;
    if (totalRounds !== undefined) room.settings.totalRounds = totalRounds;
    io.to(room.code).emit('settingsUpdated', { settings: room.settings });
  });

  socket.on('startGame', () => {
    const room = rooms.get(socket.roomCode);
    if (!room) return;
    const player = room.players.find(p => p.id === socket.id);
    if (!player?.isHost) return;
    if (room.players.length < 3) return socket.emit('error', { message: 'Need at least 3 players' });

    // Shuffle turn order
    room.turnOrder = room.players.map((_, i) => i).sort(() => Math.random() - 0.5);
    room.currentRound = 0;
    room.currentTurnIndex = 0;
    room.state = 'playing';
    room.usedCategories = [];

    io.to(room.code).emit('gameStarted', { turnOrder: room.turnOrder.map(i => room.players[i].name) });
    startTurn(room);
  });

  socket.on('selectCategory', ({ category }) => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.state !== 'category') return;
    const tunerIdx = room.turnOrder[room.currentTurnIndex];
    if (room.players[tunerIdx].id !== socket.id) return;

    room.currentCategory = category;
    room.usedCategories.push(category);
    room.currentNumber = generateNumber();
    room.state = 'answer';

    // Only tuner sees the number
    socket.emit('numberAssigned', { number: room.currentNumber, category });
    // Others see waiting
    socket.to(room.code).emit('tunerChoosing', { category, tunerName: room.players[tunerIdx].name });
  });

  socket.on('submitAnswer', ({ answer }) => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.state !== 'answer') return;
    const tunerIdx = room.turnOrder[room.currentTurnIndex];
    if (room.players[tunerIdx].id !== socket.id) return;

    room.currentAnswer = answer;
    room.state = 'guessing';
    room.guesses = new Map();

    io.to(room.code).emit('guessPhase', {
      category: room.currentCategory,
      answer: room.currentAnswer,
      tunerName: room.players[tunerIdx].name,
      timer: room.settings.timer
    });
  });

  socket.on('submitGuess', ({ guess }) => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.state !== 'guessing') return;
    const tunerIdx = room.turnOrder[room.currentTurnIndex];
    if (room.players[tunerIdx].id === socket.id) return; // Tuner can't guess

    room.guesses.set(socket.id, guess);

    // Notify others that this player has guessed
    const guesserName = room.players.find(p => p.id === socket.id)?.name;
    io.to(room.code).emit('playerGuessed', { name: guesserName, total: room.guesses.size, needed: room.players.length - 1 });

    // Check if all guessers have submitted
    if (room.guesses.size >= room.players.length - 1) {
      doReveal(room);
    }
  });

  socket.on('timerExpired', () => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.state !== 'guessing') return;
    const player = room.players.find(p => p.id === socket.id);
    if (!player?.isHost) return;
    doReveal(room);
  });

  socket.on('nextRound', () => {
    const room = rooms.get(socket.roomCode);
    if (!room) return;
    const player = room.players.find(p => p.id === socket.id);
    if (!player?.isHost) return;

    room.currentTurnIndex++;

    // Check if round is complete (everyone has been tuner)
    if (room.currentTurnIndex >= room.players.length) {
      room.currentRound++;
      if (room.currentRound >= room.settings.totalRounds) {
        // Game over
        room.state = 'gameover';
        const finalScores = room.players.map(p => ({ name: p.name, score: p.score }))
          .sort((a, b) => b.score - a.score);
        io.to(room.code).emit('gameOver', { scores: finalScores });
        return;
      }
      room.currentTurnIndex = 0;
    }

    startTurn(room);
  });

  socket.on('playAgain', () => {
    const room = rooms.get(socket.roomCode);
    if (!room) return;
    const player = room.players.find(p => p.id === socket.id);
    if (!player?.isHost) return;

    // Reset scores and state
    room.players.forEach(p => p.score = 0);
    room.state = 'lobby';
    room.currentRound = 0;
    room.currentTurnIndex = 0;
    room.usedCategories = [];
    io.to(room.code).emit('backToLobby', { players: room.players, settings: room.settings });
  });

  socket.on('disconnect', () => {
    const room = rooms.get(socket.roomCode);
    if (!room) return;

    const playerIdx = room.players.findIndex(p => p.id === socket.id);
    if (playerIdx === -1) return;

    const wasHost = room.players[playerIdx].isHost;
    room.players.splice(playerIdx, 1);

    if (room.players.length === 0) {
      rooms.delete(socket.roomCode);
      return;
    }

    if (wasHost) {
      // Transfer host
      room.players[0].isHost = true;
      io.to(room.code).emit('hostTransferred', { newHost: room.players[0].name });
    }

    io.to(room.code).emit('playerLeft', { players: room.players });

    // If in the middle of a game and too few players, end it
    if (room.state !== 'lobby' && room.players.length < 3) {
      room.state = 'lobby';
      io.to(room.code).emit('gameCancelled', { reason: 'Not enough players' });
    }
  });
});

function startTurn(room) {
  const tunerIdx = room.turnOrder[room.currentTurnIndex];
  const tuner = room.players[tunerIdx];

  // Get 3 categories not yet used this game (if possible)
  let available = CATEGORIES.filter(c => !room.usedCategories.includes(c));
  if (available.length < 3) available = [...CATEGORIES];
  const options = available.sort(() => Math.random() - 0.5).slice(0, 3);

  room.categoryOptions = options;
  room.state = 'category';
  room.currentCategory = null;
  room.currentNumber = null;
  room.currentAnswer = null;
  room.guesses = new Map();

  // Send category options to tuner
  const tunerSocket = io.sockets.sockets.get(tuner.id);
  if (tunerSocket) {
    tunerSocket.emit('yourTurnTuner', {
      categories: options,
      roundNumber: room.currentRound + 1,
      turnNumber: room.currentTurnIndex + 1,
      totalTurns: room.players.length
    });
  }

  // Tell everyone else to wait
  io.to(room.code).emit('newTurn', {
    tunerName: tuner.name,
    roundNumber: room.currentRound + 1,
    turnNumber: room.currentTurnIndex + 1,
    totalTurns: room.players.length
  });
}

function doReveal(room) {
  room.state = 'reveal';
  const actual = room.currentNumber;
  const tunerIdx = room.turnOrder[room.currentTurnIndex];
  const tuner = room.players[tunerIdx];

  const results = [];
  const guessValues = [];

  for (const [socketId, guess] of room.guesses) {
    const player = room.players.find(p => p.id === socketId);
    if (!player) continue;
    const points = calculateScore(guess, actual);
    player.score += points;
    guessValues.push(guess);
    results.push({ name: player.name, guess, points });
  }

  // Tuner scoring
  const tunerPoints = calculateTunerScore(guessValues, actual);
  tuner.score += tunerPoints;

  // Players who didn't guess get 0
  const nonGuessers = room.players.filter(p => 
    p.id !== tuner.id && !room.guesses.has(p.id)
  );
  for (const p of nonGuessers) {
    results.push({ name: p.name, guess: null, points: 0 });
  }

  io.to(room.code).emit('reveal', {
    actual,
    category: room.currentCategory,
    answer: room.currentAnswer,
    tunerName: tuner.name,
    tunerPoints,
    results: results.sort((a, b) => b.points - a.points),
    scores: room.players.map(p => ({ name: p.name, score: p.score })).sort((a, b) => b.score - a.score),
    isLastTurn: room.currentTurnIndex >= room.players.length - 1 && room.currentRound >= room.settings.totalRounds - 1
  });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Wavelength running on port ${PORT}`);
});
