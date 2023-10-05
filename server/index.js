import express from "express";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

// adding __filename and __dirname variables since they are not pre-defined in ES6
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3500;

// declaring express
const app = express();

app.use(express.static(path.join(__dirname, "public")));

const expressServer = app.listen(PORT, () => {
  console.log(`Listening on port: ${PORT}`);
});

const io = new Server(expressServer, {
  // with server and front-end on the same address we don't need to define cors
  cors: {
    origin:
      process.env.NODE_ENV === "production"
        ? false
        : ["http://localhost:5500", "http://127.0.0.1:5500"],
  },
});

io.on("connection", (socket) => {
  console.log(`User ${socket.id} connected`);
  socket.on("message", (data) => {
    console.log(data);
    io.emit("message", `${socket.id.substring(0, 5)}: ${data}`);
  });
});
