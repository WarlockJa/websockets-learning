import express from "express";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

// adding __filename and __dirname variables since they are not pre-defined in ES6
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3500;
const ADMIN = "Admin";

// declaring express
const app = express();

app.use(express.static(path.join(__dirname, "public")));

const expressServer = app.listen(PORT, () => {
  console.log(`Listening on port: ${PORT}`);
});

// state
const UsersState = {
  users: [],
  setUsers: function (newUsersArray) {
    this.users = newUsersArray;
  },
};

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

  // Upon connection - only to user
  socket.emit("message", buildMsg(ADMIN, "Welcome to Chat App!"));

  // Upon connection - inside the room message and leaving previous room if needed
  socket.on("enterRoom", ({ name, room }) => {
    // leave previous room
    const prevRoom = getUser(socket.id)?.room;
    // previous room found. leaving the room and posting a message
    if (prevRoom) {
      socket.leave(prevRoom);
      io.to(prevRoom).emit(
        "message",
        buildMsg(ADMIN, `${name} has left the room`)
      );
    }

    // activating user
    const user = activateUser(socket.id, name, room);
    // Cannot update previous room users list until after the state update in activate user
    // updating users list in the previous room
    if (prevRoom) {
      io.to(prevRoom).emit("userList", {
        users: getUsersInRoom(prevRoom),
      });
    }

    // joining new room
    socket.join(user.room);

    // sending message to the user who joined
    socket.emit(
      "message",
      buildMsg(ADMIN, `You have joined the ${user.room} chat room`)
    );

    // to everyone else
    socket.broadcast
      .to(user.room)
      .emit("message", buildMsg(ADMIN, `${user.name} has joined the room`));

    // updating user's users list for the room
    io.to(user.room).emit("userList", {
      users: getUsersInRoom(user.room),
    });

    // updating users list for the room for all
    io.emit("roomList", {
      rooms: getAllActiveRooms(),
    });
  });

  // When user disconnects - to all others
  socket.on("disconnect", () => {
    const user = getUser(socket.id);

    // removing user from state
    userLeavesApp(socket.id);

    if (user) {
      // sending user left message to the room
      io.to(user.room).emit(
        "message",
        buildMsg(ADMIN, `${user.name} has left the room`)
      );

      // updating users list in teh room
      io.to(user.room).emit("userList", {
        users: getUsersInRoom(user.room),
      });

      // updating rooms list in case this was the last user
      io.emit("roomList", {
        rooms: getAllActiveRooms(),
      });
    }
  });

  // Listening for a message event
  socket.on("message", ({ name, text }) => {
    // finding room the user is in
    const room = getUser(socket.id)?.room;

    // writing message to the room as user
    if (room) {
      io.to(room).emit("message", buildMsg(name, text));
    }
  });

  // Listen for activity
  socket.on("activity", (name) => {
    // finding room the user is in
    const room = getUser(socket.id)?.room;

    // broadcasting typing activity to the chat room
    if (room) {
      socket.broadcast.to(room).emit("activity", name);
    }
  });
});

function buildMsg(name, text) {
  return {
    name,
    text,
    time: new Intl.DateTimeFormat("default", {
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    }).format(new Date()),
  };
}

// User functions
function activateUser(id, name, room) {
  const user = {
    id,
    name,
    room,
  };
  UsersState.setUsers([
    ...UsersState.users.filter((user) => user.id !== id),
    user,
  ]);

  return user;
}

function userLeavesApp(id) {
  UsersState.setUsers([...UsersState.users.filter((user) => user.id !== id)]);
}

function getUser(id) {
  return UsersState.users.find((user) => user.id === id);
}

function getUsersInRoom(room) {
  return UsersState.users.filter((user) => user.room === room);
}

function getAllActiveRooms() {
  return Array.from(new Set(UsersState.users.map((user) => user.room)));
}
