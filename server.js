const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let players = {};
let oniId = null;

io.on("connection", (socket) => {
  console.log("接続:", socket.id);

  players[socket.id] = {
    x: 100 + Math.random() * 600,
    y: 100 + Math.random() * 400,
    oni: false
  };

  // 最初の1人を鬼にする
  if (oniId === null) {
    oniId = socket.id;
    players[socket.id].oni = true;
  }

  io.emit("currentPlayers", players);

  socket.on("move", (data) => {
    if (!players[socket.id]) return;

    players[socket.id].x = data.x;
    players[socket.id].y = data.y;

    io.emit("currentPlayers", players);
  });

  socket.on("disconnect", () => {
    const wasOni = players[socket.id]?.oni;

    delete players[socket.id];

    // 鬼が抜けたら別の人を鬼にする
    if (wasOni) {
      oniId = null;

      for (const id in players) {
        oniId = id;
        players[id].oni = true;
        break;
      }
    }

    io.emit("currentPlayers", players);
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`サーバー起動 : ${PORT}`);
});
