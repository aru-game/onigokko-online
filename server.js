const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const MAX_PLAYERS = 4;

const spawnPoints = [
  { x: 80, y: 80 },      // 左上
  { x: 1000, y: 80 },    // 右上
  { x: 80, y: 600 },     // 左下
  { x: 1000, y: 600 }    // 右下
];

let players = {};
let gameStarted = false;
let gameOver = false;
let countdown = 3;
let timer = 60;

function startGame() {
  if (Object.keys(players).length < 2) {
    gameStarted = false;
    return;
  }

  gameStarted = false;
  gameOver = false;
  countdown = 3;
  timer = 60;

  // 全員を逃げにする
  for (const id in players) {
    players[id].oni = false;
    players[id].alive = true;
  }

  // ランダムで鬼を1人決定
  const ids = Object.keys(players);
  const oni =
    ids[Math.floor(Math.random() * ids.length)];

  players[oni].oni = true;

  io.emit("currentPlayers", players);

  const countInterval = setInterval(() => {
    countdown--;

    io.emit("countdown", countdown);

    if (countdown <= 0) {
      clearInterval(countInterval);

      gameStarted = true;

      io.emit("gameStart");

      const timerInterval = setInterval(() => {
        if (!gameStarted) {
          clearInterval(timerInterval);
          return;
        }

        timer--;

        io.emit("timer", timer);

        // 逃げ切り勝ち
        if (timer <= 0) {
          gameStarted = false;
          gameOver = true;

          io.emit(
            "gameOver",
            "逃げ側の勝ち！"
          );

          clearInterval(timerInterval);
        }
      }, 1000);
    }
  }, 1000);
}

io.on("connection", (socket) => {
  console.log("接続:", socket.id);

  if (
    Object.keys(players).length >=
    MAX_PLAYERS
  ) {
    socket.emit("roomFull");
    return;
  }

  const index =
    Object.keys(players).length;

  players[socket.id] = {
    x: spawnPoints[index].x,
    y: spawnPoints[index].y,
    oni: false,
    alive: true
  };

  io.emit("currentPlayers", players);

  if (
    Object.keys(players).length >= 2 &&
    !gameStarted
  ) {
    startGame();
  }

  socket.on("move", (data) => {
    if (
      !players[socket.id] ||
      !gameStarted
    )
      return;

    players[socket.id].x = data.x;
    players[socket.id].y = data.y;

    io.emit("playerMoved", {
      id: socket.id,
      x: data.x,
      y: data.y
    });

    // 鬼判定
    const me = players[socket.id];

    if (!me.oni) return;

    for (const id in players) {
      if (
        id === socket.id ||
        !players[id].alive
      ) {
        continue;
      }

      const p = players[id];

      const dx = me.x - p.x;
      const dy = me.y - p.y;

      const distance =
        Math.sqrt(dx * dx + dy * dy);

      if (distance < 40) {
        p.alive = false;

        io.emit("currentPlayers", players);

        const alive =
          Object.values(players).filter(
            (p) =>
              !p.oni && p.alive
          );

        if (alive.length === 0) {
          gameStarted = false;
          gameOver = true;

          io.emit(
            "gameOver",
            "鬼の勝ち！"
          );
        }
      }
    }
  });

  socket.on("restart", () => {
    if (
      Object.keys(players).length >= 2
    ) {
      startGame();
    }
  });

  socket.on("disconnect", () => {
    delete players[socket.id];

    io.emit("currentPlayers", players);
  });
});

const PORT =
  process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log("サーバー起動");
});

if (Object.keys(players).length >= 2 && !gameStarted) {
  console.log("startGame");
  startGame();
}
