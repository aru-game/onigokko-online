const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const PORT = process.env.PORT || 3000;
const MAX_PLAYERS = 4;

const MAP_WIDTH = 2400;
const MAP_HEIGHT = 1400;

const spawnPoints = [
  { x: 100, y: 100 },
  { x: MAP_WIDTH - 140, y: 100 },
  { x: 100, y: MAP_HEIGHT - 140 },
  { x: MAP_WIDTH - 140, y: MAP_HEIGHT - 140 }
];

let players = {};
let gameStarted = false;
let timer = 60;
let timerInterval = null;
let countdownInterval = null;

function sendPlayers() {
  io.emit("currentPlayers", players);
}

function assignRoles() {
  const ids = Object.keys(players);

  ids.forEach((id, index) => {
    players[id].number = index + 1;
    players[id].oni = false;
    players[id].alive = true;

    players[id].x = spawnPoints[index].x;
    players[id].y = spawnPoints[index].y;
  });

  if (ids.length >= 2) {
    const oniId =
      ids[Math.floor(Math.random() * ids.length)];

    players[oniId].oni = true;
  }
}

function startGame() {
  if (Object.keys(players).length < 2) {
    return;
  }

  clearInterval(timerInterval);
  clearInterval(countdownInterval);

  timer = 60;
  gameStarted = false;

  assignRoles();
  sendPlayers();

  let count = 3;

  io.emit("countdown", count);

  countdownInterval = setInterval(() => {
    count--;

    io.emit("countdown", count);

    if (count <= 0) {
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

    const me = players[socket.id];

    me.x = data.x;
    me.y = data.y;

    io.emit("playerMoved", {
      id: socket.id,
      x: me.x,
      y: me.y
    });

    // 鬼なら判定
    if (!me.oni) return;

    for (const id in players) {
      if (id === socket.id) continue;

      const p = players[id];

      if (!p.alive) continue;
      if (p.oni) continue;

      const dx = me.x - p.x;
      const dy = me.y - p.y;

      const distance =
        Math.sqrt(dx * dx + dy * dy);

      if (distance < 40) {
        p.alive = false;

        sendPlayers();

        const aliveRunners =
          Object.values(players).filter(
            p =>
              !p.oni &&
              p.alive
          );

        if (aliveRunners.length === 0) {
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
      players[id].number =
        index + 1;
    });

    sendPlayers();
  });
});

server.listen(PORT, () => {
  console.log(
    `Server Start : ${PORT}`
  );
});
