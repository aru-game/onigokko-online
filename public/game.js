const socket = io();

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const miniCanvas = document.getElementById("miniMap");
const miniCtx = miniCanvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

miniCanvas.width = 160;
miniCanvas.height = 100;

window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

const MAP_WIDTH = 2400;
const MAP_HEIGHT = 1400;

const PLAYER_SIZE = 40;
const SPEED = 5;

let myId = null;
let players = {};
let canMove = false;

let me = {
  x: 100,
  y: 100
};

let camera = {
  x: 0,
  y: 0
};

// 障害物
const obstacles = [
  { x: 500, y: 300, width: 300, height: 50 },
  { x: 1200, y: 400, width: 50, height: 300 },
  { x: 1700, y: 900, width: 300, height: 50 },
  { x: 700, y: 1000, width: 300, height: 50 },
  { x: 1800, y: 200, width: 50, height: 300 }
];

// ===================
// Socket
// ===================

socket.on("connect", () => {
  myId = socket.id;
});

socket.on("roomFull", () => {
  alert("部屋が満員です");
});

socket.on("currentPlayers", (serverPlayers) => {
  players = serverPlayers;

  if (players[myId]) {
    me.x = players[myId].x;
    me.y = players[myId].y;

    document.getElementById(
      "myName"
    ).textContent =
      "あなたはプレイヤー" +
      players[myId].number +
      "です";
  }

  for (const id in players) {
    if (players[id].oni) {
      document.getElementById(
        "oniText"
      ).textContent =
        "プレイヤー" +
        players[id].number +
        "が鬼です！";
    }
  }
});

socket.on("playerMoved", (player) => {
  if (!players[player.id]) return;

  players[player.id].x = player.x;
  players[player.id].y = player.y;
});

socket.on("countdown", (n) => {
  const c =
    document.getElementById("countdown");

  if (n > 0) {
    c.textContent = n;
    canMove = false;
  } else {
    c.textContent = "START!";
    canMove = true;

    setTimeout(() => {
      c.textContent = "";
    }, 1000);
  }
});

socket.on("timer", (t) => {
  document.getElementById(
    "timer"
  ).textContent =
    "残り " + t + " 秒";
});

socket.on("gameStart", () => {
  canMove = true;

  document.getElementById(
    "message"
  ).textContent = "";
});

socket.on("gameOver", (msg) => {
  canMove = false;

  document.getElementById(
    "message"
  ).textContent = msg;
});

// ===================
// 入力
// ===================

const keys = {};

window.addEventListener(
  "keydown",
  (e) => {
    keys[e.key] = true;
  }
);

window.addEventListener(
  "keyup",
  (e) => {
    keys[e.key] = false;
  }
);

// ===================
// スマホボタン
// ===================

const mobile = {
  up: false,
  down: false,
  left: false,
  right: false
};

function setButton(id, key) {
  const b =
    document.getElementById(id);

  if (!b) return;

  b.addEventListener(
    "touchstart",
    (e) => {
      e.preventDefault();
      mobile[key] = true;
    }
  );

  b.addEventListener(
    "touchend",
    (e) => {
      e.preventDefault();
      mobile[key] = false;
    }
  );
}

setButton("up", "up");
setButton("down", "down");
setButton("left", "left");
setButton("right", "right");

// ===================
// 壁判定
// ===================

function hitWall(x, y) {
  for (const o of obstacles) {
    if (
      x < o.x + o.width &&
      x + PLAYER_SIZE > o.x &&
      y < o.y + o.height &&
      y + PLAYER_SIZE > o.y
    ) {
      return true;
    }
  }

  return false;
}

// ===================
// 更新
// ===================

function update() {
  if (!canMove) return;
  if (!players[myId]) return;

  let dx = 0;
  let dy = 0;

  if (keys["ArrowUp"] || mobile.up)
    dy -= SPEED;

  if (keys["ArrowDown"] || mobile.down)
    dy += SPEED;

  if (keys["ArrowLeft"] || mobile.left)
    dx -= SPEED;

  if (keys["ArrowRight"] || mobile.right)
    dx += SPEED;

  if (!hitWall(me.x + dx, me.y)) {
    me.x += dx;
  }

  if (!hitWall(me.x, me.y + dy)) {
    me.y += dy;
  }

  me.x = Math.max(
    0,
    Math.min(
      MAP_WIDTH - PLAYER_SIZE,
      me.x
    )
  );

  me.y = Math.max(
    0,
    Math.min(
      MAP_HEIGHT - PLAYER_SIZE,
      me.y
    )
  );

  camera.x =
    me.x -
    canvas.width / 2 +
    PLAYER_SIZE / 2;

  camera.y =
    me.y -
    canvas.height / 2 +
    PLAYER_SIZE / 2;

  camera.x = Math.max(
    0,
    Math.min(
      MAP_WIDTH - canvas.width,
      camera.x
    )
  );

  camera.y = Math.max(
    0,
    Math.min(
      MAP_HEIGHT - canvas.height,
      camera.y
    )
  );

  socket.emit("move", {
    x: me.x,
    y: me.y
  });
}

// ===================
// 描画
// ===================

function draw() {
  ctx.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  ctx.save();

  ctx.translate(
    -camera.x,
    -camera.y
  );

  // 地面
  ctx.fillStyle = "#7bc96f";
  ctx.fillRect(
    0,
    0,
    MAP_WIDTH,
    MAP_HEIGHT
  );

  // 障害物
  ctx.fillStyle = "#555";

  for (const o of obstacles) {
    ctx.fillRect(
      o.x,
      o.y,
      o.width,
      o.height
    );
  }

  // プレイヤー
  for (const id in players) {
    const p = players[id];

    if (!p.alive) continue;

    ctx.fillStyle =
      p.oni ? "red" : "deepskyblue";

    ctx.fillRect(
      p.x,
      p.y,
      PLAYER_SIZE,
      PLAYER_SIZE
    );

    ctx.fillStyle = "white";
    ctx.font = "18px sans-serif";

    ctx.fillText(
      "P" + p.number,
      p.x + 5,
      p.y - 10
    );
  }

  ctx.restore();

  drawMiniMap();
}

// ===================
// ミニマップ
// ===================

function drawMiniMap() {
  miniCtx.clearRect(
    0,
    0,
    miniCanvas.width,
    miniCanvas.height
  );

  miniCtx.fillStyle =
    "rgba(0,0,0,0.3)";
  miniCtx.fillRect(
    0,
    0,
    miniCanvas.width,
    miniCanvas.height
  );

  const scaleX =
    miniCanvas.width / MAP_WIDTH;

  const scaleY =
    miniCanvas.height / MAP_HEIGHT;

  for (const id in players) {
    const p = players[id];

    if (!p.alive) continue;

    miniCtx.fillStyle =
      p.oni ? "red" : "cyan";

    miniCtx.fillRect(
      p.x * scaleX,
      p.y * scaleY,
      6,
      6
    );
  }
}

// ===================
// リスタート
// ===================

document
  .getElementById("restart")
  .addEventListener(
    "click",
    () => {
      socket.emit("restart");
    }
  );

// ===================
// メインループ
// ===================

function gameLoop() {
  update();
  draw();

  requestAnimationFrame(
    gameLoop
  );
}

gameLoop();
