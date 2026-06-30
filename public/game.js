const socket = io();

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

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