const socket = io();

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let myId = null;
let players = {};

let me = {
  x: 100,
  y: 100,
  speed: 5
};

const obstacles = [
  { x: 200, y: 150, width: 120, height: 200 },
  { x: 500, y: 120, width: 180, height: 60 },
  { x: 300, y: 450, width: 250, height: 70 },
  { x: 700, y: 300, width: 100, height: 220 }
];

socket.on("connect", () => {
  myId = socket.id;
});

socket.on("currentPlayers", (serverPlayers) => {
  players = serverPlayers;
});

socket.on("newPlayer", (player) => {
  players[player.id] = {
    x: player.x,
    y: player.y
  };
});

socket.on("playerMoved", (player) => {
  players[player.id] = {
    x: player.x,
    y: player.y
  };
});

socket.on("playerDisconnected", (id) => {
  delete players[id];
});

const keys = {};

window.addEventListener("keydown", (e) => {
  keys[e.key] = true;
});

window.addEventListener("keyup", (e) => {
  keys[e.key] = false;
});

function hitWall(x, y, size) {
  for (const obs of obstacles) {
    if (
      x < obs.x + obs.width &&
      x + size > obs.x &&
      y < obs.y + obs.height &&
      y + size > obs.y
    ) {
      return true;
    }
  }

  return false;
}

function update() {
  let dx = 0;
  let dy = 0;

  if (keys["ArrowUp"]) dy -= me.speed;
  if (keys["ArrowDown"]) dy += me.speed;
  if (keys["ArrowLeft"]) dx -= me.speed;
  if (keys["ArrowRight"]) dx += me.speed;

  if (!hitWall(me.x + dx, me.y, 40)) {
    me.x += dx;
  }

  if (!hitWall(me.x, me.y + dy, 40)) {
    me.y += dy;
  }

  me.x = Math.max(0, Math.min(canvas.width - 40, me.x));
  me.y = Math.max(0, Math.min(canvas.height - 40, me.y));

  socket.emit("move", me);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "gray";

  for (const obs of obstacles) {
    ctx.fillRect(
      obs.x,
      obs.y,
      obs.width,
      obs.height
    );
  }

  for (const id in players) {
    const p = players[id];

    if (id === myId) {
      ctx.fillStyle = "red";
    } else {
      ctx.fillStyle = "blue";
    }

    ctx.fillRect(p.x, p.y, 40, 40);
  }
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();
