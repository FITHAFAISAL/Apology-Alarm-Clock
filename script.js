// UI elements
const setAlarmBtn = document.getElementById("setAlarm");
const alarmTimeInput = document.getElementById("alarmTime");
const alarmSoundInput = document.getElementById("alarmSound");
const snoozeInput = document.getElementById("snoozeDuration");

const alarmSetDisplay = document.getElementById("alarmSetDisplay");
const alarmMessage = document.getElementById("alarmMessage");
const guiltEmoji = document.getElementById("guiltEmoji");
const snoozeBtn = document.getElementById("snoozeBtn");
const stopBtn = document.getElementById("stopBtn");
const player = document.getElementById("player");
const gameContainer = document.getElementById("gameContainer");
const gameCanvas = document.getElementById("gameCanvas");
const ctx = gameCanvas.getContext("2d");
const intervention = document.getElementById("intervention");

let alarmTime = null;
let snoozeCount = 0;
const maxSnoozes = 2;
let speakInterval = null;
let availableVoices = [];
let alarmActive = false;
let gameRunning = false;
let gameFinished = false;

// Snake game state
let snake = [{ x: 200, y: 200 }];
let dx = 20, dy = 0;
let food = null;
let gameTick = null;

// load voices when available
window.speechSynthesis.onvoiceschanged = () => {
  availableVoices = window.speechSynthesis.getVoices();
};

// helper: spawn food aligned to 20px grid
function spawnFood() {
  const cols = Math.floor(gameCanvas.width / 20);
  const rows = Math.floor(gameCanvas.height / 20);
  return {
    x: Math.floor(Math.random() * cols) * 20,
    y: Math.floor(Math.random() * rows) * 20
  };
}

// set alarm
setAlarmBtn.onclick = () => {
  alarmTime = alarmTimeInput.value;
  if (!alarmTime) {
    alert("Please select a valid alarm time!");
    return;
  }

  // set player source if custom sound chosen (not played yet)
  if (alarmSoundInput.files[0]) {
    player.src = URL.createObjectURL(alarmSoundInput.files[0]);
  } else {
    player.src = "https://cdn.pixabay.com/download/audio/2021/09/28/audio_b3d80f9627.mp3";
  }

  snoozeCount = 0;
  alarmSetDisplay.textContent = `Alarm set for: ${alarmTime}`;
  alarmMessage.textContent = "";
  guiltEmoji.textContent = "🥺";
  snoozeBtn.classList.add("hidden");
  stopBtn.classList.add("hidden");
  intervention.classList.add("hidden");
  gameContainer.classList.add("hidden");

  alert(`Alarm set for ${alarmTime}`);
};

// periodic check
setInterval(() => {
  if (!alarmTime) return;
  const now = new Date();
  const currentTime = now.toTimeString().slice(0,5);
  if (alarmTime === currentTime && !alarmActive) {
    triggerAlarm();
    alarmTime = null; // prevent multiple triggers in same minute
  }
}, 1000);

// trigger alarm: play sound, speak message, show controls
function triggerAlarm() {
  alarmActive = true;
  player.loop = true;
  player.play().catch(()=>{/* handle autoplay blocking silently */});

  alarmMessage.textContent = "I am sorry to wake you up but it's time.";
  guiltEmoji.textContent = ["🥺","😓","😔","😢"][Math.min(snoozeCount,3)];

  // buttons always visible when alarm rings (snooze present every time),
  // but snooze disabled when exhausted
  snoozeBtn.classList.remove("hidden");
  stopBtn.classList.remove("hidden");
  updateSnoozeState();

  // start repeating speech every 5 seconds for clarity
  speakAlarmMessage(alarmMessage.textContent);
  clearInterval(speakInterval);
  speakInterval = setInterval(() => speakAlarmMessage(alarmMessage.textContent), 5000);
}

// speak with best available voice
function speakAlarmMessage(text) {
  if (!window.speechSynthesis) return;
  const msg = new SpeechSynthesisUtterance(text);

  const clearVoice =
    availableVoices.find(v => v.lang.startsWith("en") && v.name.toLowerCase().includes("google")) ||
    availableVoices.find(v => v.lang.startsWith("en")) ||
    availableVoices[0];

  if (clearVoice) msg.voice = clearVoice;
  msg.rate = 0.95;
  msg.pitch = 1;
  msg.volume = 1;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(msg);
}

// update snooze button enabled/disabled based on snoozeCount
function updateSnoozeState() {
  if (snoozeCount >= maxSnoozes) {
    snoozeBtn.disabled = true;
    snoozeBtn.textContent = `Snooze (${snoozeCount}/${maxSnoozes})`;
  } else {
    snoozeBtn.disabled = false;
    snoozeBtn.textContent = `Snooze (${snoozeCount}/${maxSnoozes})`;
  }
}

// snooze logic
snoozeBtn.onclick = () => {
  if (!alarmActive) return;
  const minDuration = Math.max(1, parseInt(snoozeInput.value) || 1);
  if (minDuration < 1) {
    alert("Minimum snooze duration is 1 minute.");
    return;
  }

  if (snoozeCount >= maxSnoozes) {
    // exhausted — inform user and start the forced game
    alert("Snooze limit reached — you must play the game to stop the alarm.");
    startInvertedSnake();
    return;
  }

  snoozeCount++;
  updateSnoozeState();

  // compute new alarm time
  const newAlarmDate = new Date(Date.now() + minDuration * 60000);
  alarmTime = newAlarmDate.toTimeString().slice(0,5);
  alarmSetDisplay.textContent = `Alarm snoozed to: ${alarmTime}`;

  // pause audio and speech for snooze
  player.pause();
  player.currentTime = 0;
  window.speechSynthesis.cancel();
  clearInterval(speakInterval);

  alarmActive = false;
  alarmMessage.textContent = `Okay, snoozed. (${snoozeCount}/${maxSnoozes})`;
  guiltEmoji.textContent = "😴";

  // ensure snooze button still visible (the user wanted it present every time)
  snoozeBtn.classList.remove("hidden");
  stopBtn.classList.remove("hidden");
};

// stop button logic
stopBtn.onclick = () => {
  if (!alarmActive) {
    // no active alarm — nothing
    return;
  }

  if (snoozeCount >= maxSnoozes) {
    // enforce game
    startInvertedSnake();
    return;
  } else {
    // allow stopping if under snooze limit
    stopAlarmClean();
  }
};

// stop alarm: stop audio and speech, cleanup UI
function stopAlarmClean() {
  player.pause();
  player.currentTime = 0;
  window.speechSynthesis.cancel();
  clearInterval(speakInterval);
  alarmActive = false;
  alarmMessage.textContent = "Alarm stopped. Have a nice day! 💖";
  alarmSetDisplay.textContent = "";
  guiltEmoji.textContent = "🥺";
  snoozeBtn.classList.add("hidden");
  stopBtn.classList.add("hidden");
  gameContainer.classList.add("hidden");
}

// --- Inverted snake game ---
// start game and ensure alarm keeps playing
function startInvertedSnake() {
  if (!alarmActive) {
    // if alarm isn't currently flagged active, ensure it's playing
    alarmActive = true;
    player.loop = true;
    player.play().catch(()=>{});
    speakAlarmMessage("I am sorry to wake you up but it's time");
    clearInterval(speakInterval);
    speakInterval = setInterval(() => speakAlarmMessage("I am sorry to wake you up but it's time"), 5000);
  }

  gameContainer.classList.remove("hidden");
  gameFinished = false;
  gameRunning = true;

  // reset snake state
  snake = [{ x: 200, y: 200 }];
  dx = 20; dy = 0;
  food = spawnFood();
  // start loop (use setInterval to simplify)
  if (gameTick) clearInterval(gameTick);
  gameTick = setInterval(gameLoop, 120);
}

// Inverted controls: Left arrow results in moving right, Right arrow -> left
document.addEventListener("keydown", (e) => {
  if (!gameRunning) return;
  if (e.key === "ArrowLeft") {
    // inverted: left -> right
    if (dx === 0) { dx = 20; dy = 0; }
  } else if (e.key === "ArrowRight") {
    // inverted: right -> left
    if (dx === 0) { dx = -20; dy = 0; }
  } else if (e.key === "ArrowUp") {
    if (dy === 0) { dx = 0; dy = -20; }
  } else if (e.key === "ArrowDown") {
    if (dy === 0) { dx = 0; dy = 20; }
  }
});

function gameLoop() {
  if (!gameRunning) return;

  // move snake
  const head = { x: snake[0].x + dx, y: snake[0].y + dy };
  snake.unshift(head);

  // check eat food
  if (head.x === food.x && head.y === food.y) {
    // win: stop alarm only when user eats
    gameFinished = true;
    gameRunning = false;
    clearInterval(gameTick);
    endGameAndStopAlarm();
    return;
  } else {
    snake.pop();
  }

  // collisions with wall or self -> reset snake to center (not end)
  if (head.x < 0 || head.x >= gameCanvas.width || head.y < 0 || head.y >= gameCanvas.height
      || snake.slice(1).some(seg => seg.x === head.x && seg.y === head.y)) {
    // reset
    snake = [{ x: 200, y: 200 }];
    dx = 20; dy = 0;
  }

  drawGame();
}

function drawGame() {
  // background
  ctx.fillStyle = "#e8ffd9";
  ctx.fillRect(0,0, gameCanvas.width, gameCanvas.height);

  // draw food
  ctx.fillStyle = "red";
  ctx.fillRect(food.x, food.y, 20, 20);

  // draw snake
  ctx.fillStyle = "green";
  snake.forEach((seg, i) => {
    ctx.fillStyle = i === 0 ? "#0b8f3a" : "#39c06f";
    ctx.fillRect(seg.x, seg.y, 20, 20);
  });
}

function endGameAndStopAlarm() {
  // stop audio and speech
  player.pause();
  player.currentTime = 0;
  window.speechSynthesis.cancel();
  clearInterval(speakInterval);
  alarmActive = false;

  // hide game
  gameContainer.classList.add("hidden");
  gameFinished = true;
  gameRunning = false;

  alarmMessage.textContent = "You beat the game — Alarm stopped. Good morning!";
  alarmSetDisplay.textContent = "";
  guiltEmoji.textContent = "😊";
  snoozeBtn.classList.add("hidden");
  stopBtn.classList.add("hidden");
  intervention.classList.add("hidden");

  alert("Nice! You ate the food — alarm stopped.");
}

// Initialize canvas display (hidden initially)
gameContainer.classList.add("hidden");

// utility: spawn food ensuring it doesn't overlap snake head
function spawnFood() {
  const cols = Math.floor(gameCanvas.width / 20);
  const rows = Math.floor(gameCanvas.height / 20);
  let f;
  do {
    f = { x: Math.floor(Math.random() * cols) * 20, y: Math.floor(Math.random() * rows) * 20 };
  } while (snake.some(seg => seg.x === f.x && seg.y === f.y));
  return f;
}
