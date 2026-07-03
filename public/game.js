const socket = io();

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

let myId = null;
let players = {};
let canMove = false;

const PLAYER_SIZE = 40;
const SPEED = 5;

let me = {
  x: 80,
  y: 80
};

// 障害物
const obstacles = [
  { x: 300, y: 200, width: 200, height: 50 },
  { x: 700, y: 200, width: 200, height: 50 },
  { x: 500, y: 400, width: 200, height: 50 }
];

// ====================
// Socket
// ====================

socket.on("connect", () => {
  myId = socket.id;
});

socket.on("roomFull", () => {
  alert("部屋が満員です（最大4人）");
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

  let oni = null;

  for (const id in players) {
    if (players[id].oni) {
      oni = players[id];
      break;
    }
  }

  if (oni) {
    document.getElementById(
      "oniText"
    ).textContent =
      "プレイヤー" +
      oni.number +
      "が鬼です！";
  }
});

socket.on("playerMoved", (player) => {
  if (!players[player.id]) return;

  players[player.id].x = player.x;
  players[player.id].y = player.y;
});

socket.on("countdown", (n) => {
  const c =
    document.getElementById(
      "countdown"
    );

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

// ====================
// 入力
// ====================

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

// ====================
// スマホ操作
// ====================

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

  b.addEventListener(
    "mousedown",
    () => {
      mobile[key] = true;
    }
  );

  b.addEventListener(
    "mouseup",
    () => {
      mobile[key] = false;
    }
  );

  b.addEventListener(
    "mouseleave",
    () => {
      mobile[key] = false;
    }
  );
}

setButton("up", "up");
setButton("down", "down");
setButton("left", "left");
setButton("right", "right");

// ====================
// 壁判定
// ====================

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

// ====================
// 更新
// ====================

function update() {
  if (!canMove) return;
  if (!players[myId]) return;

  let dx = 0;
  let dy = 0;

  if (
    keys["ArrowUp"] ||
    mobile.up
  ) {
    dy -= SPEED;
  }

  if (
    keys["ArrowDown"] ||
    mobile.down
  ) {
    dy += SPEED;
  }

  if (
    keys["ArrowLeft"] ||
    mobile.left
  ) {
    dx -= SPEED;
  }

  if (
    keys["ArrowRight"] ||
    mobile.right
  ) {
    dx += SPEED;
  }

  if (
    !hitWall(
      me.x + dx,
      me.y
    )
  ) {
    me.x += dx;
  }

  if (
    !hitWall(
      me.x,
      me.y + dy
    )
  ) {
    me.y += dy;
  }

  me.x = Math.max(
    0,
    Math.min(
      canvas.width -
        PLAYER_SIZE,
      me.x
    )
  );

  me.y = Math.max(
    0,
    Math.min(
      canvas.height -
        PLAYER_SIZE,
      me.y
    )
  );

  socket.emit("move", {
    x: me.x,
    y: me.y
  });
}

// ====================
// 描画
// ====================

function draw() {
  ctx.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
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

    if (p.oni) {
      ctx.fillStyle = "red";
    } else {
      ctx.fillStyle = "deepskyblue";
    }

    ctx.fillRect(
      p.x,
      p.y,
      PLAYER_SIZE,
      PLAYER_SIZE
    );

    ctx.fillStyle = "white";
    ctx.font =
      "18px sans-serif";

    ctx.fillText(
      "P" + p.number,
      p.x + 5,
      p.y - 8
    );
  }
}

// ====================
// リスタート
// ====================

document
  .getElementById(
    "restart"
  )
  .addEventListener(
    "click",
    () => {
      socket.emit(
        "restart"
      );
    }
  );

// ====================
// ループ
// ====================

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(
    gameLoop
  );
}

gameLoop();
