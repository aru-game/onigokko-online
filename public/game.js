const socket = io();

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const obstacles = [
  { x: 200, y: 150, width: 100, height: 150 },
  { x: 500, y: 100, width: 150, height: 80 },
  { x: 150, y: 400, width: 200, height: 60 },
  { x: 550, y: 350, width: 100, height: 180 },
  { x: 380, y: 250, width: 50, height: 100 }
];

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let myId = null;
let players = {};

// 自分の位置
let me = {
  x: 100,
  y: 100,
  speed: 5
};

// 接続できたら自分のIDを保存
socket.on("connect", () => {
  myId = socket.id;
});

// 今いるプレイヤーを受け取る
socket.on("currentPlayers", (serverPlayers) => {
  players = serverPlayers;
});

// 新しいプレイヤーが参加
socket.on("newPlayer", (player) => {
  players[player.id] = {
    x: player.x,
    y: player.y
  };
});

// プレイヤー移動
socket.on("playerMoved", (player) => {
  players[player.id] = {
    x: player.x,
    y: player.y
  };
});

// プレイヤー退出
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

function update() {
  if (keys["ArrowUp"]) me.y -= me.speed;
  if (keys["ArrowDown"]) me.y += me.speed;
  if (keys["ArrowLeft"]) me.x -= me.speed;
  if (keys["ArrowRight"]) me.x += me.speed;

  socket.emit("move", me);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "gray";

for (let obs of obstacles) {
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
