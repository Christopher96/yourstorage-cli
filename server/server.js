import { commands, events, rooms } from "../constants.js";

const port = process.env.PORT || 3000;
import { Server } from "socket.io";

const io = new Server(port, {});

io.on("connection", (socket) => {
  onConnect(socket);
  onCommandEvent(socket);
  onMessageEvent(socket);
  onSearchEvent(socket);
  onProxyEvent(socket);
  onDisconnect(socket);
});

function getUser(socket) {
  let user = {
    id: socket.id,
  };
  if (socket.username != null) user.username = socket.username;

  return user;
}

const fetchUsersByRoom = async (room) => {
  let userSockets = await io.in(room).fetchSockets();
  let users = userSockets.filter((socket) => socket.connected).map(getUser);
  return users;
};

function onConnect(socket) {
  console.log("Client detected [%s]", socket.id);
  socket.join(rooms.LOBBY);
}

function onDisconnect(socket) {
  socket.on("disconnected", () => {
    console.log("Client disconnected [%s]", socket.id);
  });
}

function onProxyEvent(socket) {
  function proxyEvent(event) {
    socket.on(event, function (data) {
      data.fromUser = getUser(socket);
      const targetId = data.targetId;
      delete data.targetId;

      socket.to(targetId).emit(event, data);
    });
  }
  proxyEvent(events.BROWSE);
  proxyEvent(events.BROWSE_RESPONSE);
  proxyEvent(events.BROWSE_PATH);
  proxyEvent(events.BROWSE_PATH_RESPONSE);
  proxyEvent(events.DOWNLOAD);
  proxyEvent(events.DOWNLOAD_CHUNK);
}

function onCommandEvent(socket) {
  socket.on(events.COMMAND, function (data) {
    console.log("[%s] Command: %s", socket.id, data.command);

    let response = false;

    switch (data.command) {
      case commands.LIST_USERS:
        response = fetchUsersByRoom(rooms.LOBBY);
        break;
      case commands.CHANGE_USERNAME:
        console.log(data.username);
        socket.username = data.username;
        response = socket.username;
        break;
    }

    socket.emit(events.COMMAND_RESPONSE, {
      command: data.command,
      data: response,
    });
  });
}

function onMessageEvent(socket) {
  socket.on(events.MESSAGE, function (data) {
    console.log(
      "[%s] -> [%s] Message: %s",
      socket.id,
      data.targetId,
      data.message
    );
    socket.to(data.targetId).emit(events.MESSAGE_RECEIVED, {
      fromUser: getUser(socket),
      message: data.message,
    });
  });
}

function onSearchEvent(socket) {
  socket.on(events.SEARCH_ID, async (searchTerm) => {
    let users = await fetchUsersByRoom(rooms.LOBBY);
    let result = users.filter((user) => {
      if (user.id == socket.id) return false;

      let pass = user.id.includes(searchTerm);
      if (pass == false && user.username != null)
        pass = user.username.includes(searchTerm);
      return pass;
    });
    socket.emit(events.SEARCH_ID_RESPONSE, result);
  });
}
