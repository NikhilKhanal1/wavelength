// audio.js - Audio system (music + synthesized SFX)

const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx, musicGain, sfxGain, masterGain, musicPlaying = false;
let bgMusic = null;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new AudioCtx();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 1;
  masterGain.connect(audioCtx.destination);
  musicGain = audioCtx.createGain();
  musicGain.gain.value = 0.4;
  musicGain.connect(masterGain);
  sfxGain = audioCtx.createGain();
  sfxGain.gain.value = 0.6;
  sfxGain.connect(masterGain);
}

function startMusic() {
  if (bgMusic) return;
  bgMusic = new Audio('/Main Menu - New Super Mario Bros. U OST.mp3');
  bgMusic.loop = true;
  bgMusic.volume = 0.4;
  bgMusic.play().catch(function() {});
  musicPlaying = true;
}

function stopMusic() {
  if (bgMusic) { bgMusic.pause(); }
  musicPlaying = false;
}

function playSound(type) {
  initAudio();
  var osc = audioCtx.createOscillator();
  var gain = audioCtx.createGain();
  var filter = audioCtx.createBiquadFilter();
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(sfxGain);
  filter.type = 'lowpass';
  filter.frequency.value = 2000;

  switch (type) {
    case 'join':
      osc.type = 'sine'; osc.frequency.value = 523;
      gain.gain.value = 0.2;
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
      osc.start(); osc.stop(audioCtx.currentTime + 0.35);
      break;
    case 'select':
      osc.type = 'triangle'; osc.frequency.value = 800;
      gain.gain.value = 0.12;
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
      osc.start(); osc.stop(audioCtx.currentTime + 0.08);
      break;
    case 'reveal':
      osc.type = 'sine'; osc.frequency.value = 350;
      osc.frequency.exponentialRampToValueAtTime(750, audioCtx.currentTime + 0.4);
      gain.gain.value = 0.18;
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      osc.start(); osc.stop(audioCtx.currentTime + 0.5);
      break;
    case 'score':
      osc.type = 'sine'; osc.frequency.value = 440;
      gain.gain.value = 0.18;
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc.start(); osc.stop(audioCtx.currentTime + 0.15);
      setTimeout(function() {
        var o2 = audioCtx.createOscillator();
        var g2 = audioCtx.createGain();
        o2.connect(g2); g2.connect(sfxGain);
        o2.type = 'sine'; o2.frequency.value = 660;
        g2.gain.value = 0.18;
        g2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
        o2.start(); o2.stop(audioCtx.currentTime + 0.35);
      }, 100);
      break;
    case 'gameover':
      osc.type = 'sine'; gain.gain.value = 0.18;
      [262, 330, 392, 523].forEach(function(f, i) {
        osc.frequency.setValueAtTime(f, audioCtx.currentTime + i * 0.15);
      });
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.8);
      osc.start(); osc.stop(audioCtx.currentTime + 0.8);
      break;
    case 'pin':
      osc.type = 'sine'; osc.frequency.value = 200 + Math.random() * 100;
      gain.gain.value = 0.15;
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
      filter.frequency.value = 800;
      osc.start(); osc.stop(audioCtx.currentTime + 0.2);
      break;
    case 'dot':
      osc.type = 'sine'; osc.frequency.value = 500 + Math.random() * 200;
      gain.gain.value = 0.08;
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      osc.start(); osc.stop(audioCtx.currentTime + 0.1);
      break;
    case 'whoosh':
      osc.type = 'sine'; osc.frequency.value = 150;
      osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.25);
      gain.gain.value = 0.08;
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
      osc.start(); osc.stop(audioCtx.currentTime + 0.25);
      break;
    case 'lock':
      osc.type = 'triangle'; osc.frequency.value = 400;
      gain.gain.value = 0.12;
      osc.frequency.setValueAtTime(400, audioCtx.currentTime);
      osc.frequency.setValueAtTime(520, audioCtx.currentTime + 0.07);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.18);
      osc.start(); osc.stop(audioCtx.currentTime + 0.18);
      break;
    case 'countdown':
      osc.type = 'sine'; osc.frequency.value = 880;
      gain.gain.value = 0.05;
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
      osc.start(); osc.stop(audioCtx.currentTime + 0.12);
      break;
    case 'vineunfurl': {
      osc.disconnect();
      var nb = audioCtx.createBuffer(1, audioCtx.sampleRate * 1, audioCtx.sampleRate);
      var nd = nb.getChannelData(0);
      for (var i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
      var ns = audioCtx.createBufferSource(); ns.buffer = nb;
      var nf = audioCtx.createBiquadFilter(); nf.type = 'lowpass';
      nf.frequency.setValueAtTime(2000, audioCtx.currentTime);
      nf.frequency.exponentialRampToValueAtTime(500, audioCtx.currentTime + 1);
      var ng = audioCtx.createGain();
      ng.gain.setValueAtTime(0.09, audioCtx.currentTime);
      ng.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1);
      ns.connect(nf); nf.connect(ng); ng.connect(sfxGain);
      ns.start(); ns.stop(audioCtx.currentTime + 1.1);
      break;
    }
    case 'splat':
      osc.type = 'sine'; osc.frequency.value = 100;
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
      osc.start(); osc.stop(audioCtx.currentTime + 0.06);
      break;
  }
}
