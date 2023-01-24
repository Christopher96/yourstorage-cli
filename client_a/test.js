import { io } from "socket.io-client";

let socket_uri = "http://192.168.1.226:9999";
console.log("Connecting to %s", socket_uri);
let client_server = io(socket_uri);
client_server.on("connect", () => {
  console.log("Connected to client [%s]", user.id);
});
