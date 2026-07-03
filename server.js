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
let countdown = 3;
let timer = 60;
let oniId = null;
let timerInterval = null;
let countdownInterval = null;

function sendPlayers() {
  io.emit("currentPlayers", players);
}

function resetGame() {
  gameStarted = false;
  countdown = 3;
  timer = 60;

  clearInterval(timerInterval);
  clearInterval(countdownInterval);

  oniId = null;

  const ids = Object.keys(players);

  ids.forEach((id, index) => {
    players[id].x = spawnPoints[index].x;
    players[id].y = spawnPoints[index].y;
    players[id].alive = true;
    players[id].oni = false;
  });

  if (ids.length >= 2) {
    oniId =
      ids[Math.floor(Math.random() * ids.length)];

    players[oniId].oni = true;
  }

  sendPlayers();
}

function startGame() {
  if (Object.keys(players).length < 2) {
    return;
  }

  resetGame();

  countdownInterval = setInterval(() => {
    io.emit("countdown", countdown);

    countdown--;

    if (countdown < 0) {
      clearInterval(countdownInterval);

      gameStarted = true;

      io.emit("gameStart");

      timerInterval = setInterval(() => {
        timer--;

        io.emit("timer", timer);

        if (timer <= 0) {
          clearInterval(timerInterval);
          gameStarted = false;

          io.emit(
            "gameOver",
            "逃げ側の勝利！"
          );
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
    number: index + 1,
    x: spawnPoints[index].x,
    y: spawnPoints[index].y,
    oni: false,
    alive: true
  };

  sendPlayers();

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
    ) {
      return;
    }

    players[socket.id].x = data.x;
    players[socket.id].y = data.y;

    io.emit("playerMoved", {
      id: socket.id,
      x: data.x,
      y: data.y
    });

    const me = players[socket.id];

    if (!me.oni) {
      return;
    }

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

        sendPlayers();

        const runners =
          Object.values(players).filter(
            p =>
              !p.oni &&
              p.alive
          );

        if (runners.length === 0) {
          clearInterval(timerInterval);

          gameStarted = false;

          io.emit(
            "gameOver",
            `プレイヤー${me.number}の勝利！`
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

    const ids =
      Object.keys(players);

    ids.forEach((id, index) => {
      players[id].number = index + 1;
    });

    sendPlayers();
  });
});

const PORT =
  process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(
    `サーバー起動 ${PORT}`
  );
});
