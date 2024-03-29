const commands = {
  CHANGE_USERNAME: "Change username",
  LIST_USERS: "List users",
  VIEW_MESSAGES: "View messages",
  CONNECT: "Connect",
  MESSAGE: "Message",
  SHARE: "Share directory",
  SHARE_REMOVE: "Remove shared directory",
  BROWSE: "Browse files",
  LEAVE: "Leave",
  EXIT: "Exit",
};
const events = {
  MESSAGE: "message",
  MESSAGE_RECEIVED: "message_received",
  COMMAND: "command",
  COMMAND_RESPONSE: "command_response",
  BROWSE: "browse",
  BROWSE_RESPONSE: "browse_response",
  BROWSE_PATH: "browse_path",
  BROWSE_PATH_RESPONSE: "browse_path_response",
  DOWNLOAD: "download",
  DOWNLOAD_CHUNK: "download_chunk",
  SEARCH_ID: "search_id",
  SEARCH_ID_RESPONSE: "search_id_response",
};
const rooms = {
  LOBBY: "lobby",
};
export { commands, events, rooms };
