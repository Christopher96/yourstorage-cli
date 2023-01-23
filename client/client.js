import { commands, events } from "../constants.js";

import fs from "fs";

const ascii = fs.readFileSync("../ascii.txt", "utf8");

import path from "path";
import readline from "readline";
import { io } from "socket.io-client";

import inquirer from "inquirer";
import inquirer_fuzzy from "inquirer-fuzzy-path";
import inquirer_auto_complete from "inquirer-autocomplete-prompt";
import inquirer_select_dir from "inquirer-select-directory";

inquirer.registerPrompt("fuzzypath", inquirer_fuzzy);
inquirer.registerPrompt("autocomplete", inquirer_auto_complete);
inquirer.registerPrompt("directory", inquirer_select_dir);

let local = true;
const serverUrl = local
  ? "http://localhost:3000"
  : "http://yourstorage.herokuapp.com";
// const serverUrl = "http://188.151.68.212:9999"

const socket = io(serverUrl, {
  transports: ["websocket"],
});

const savedName = "./saved.json";

function getSavedData() {
  let savedData = null;
  try {
    savedData = require(savedName);
  } catch (e) {
    savedData = {};
  }
  return savedData;
}

function saveDataType(type, newObj, callback) {
  let savedData = getSavedData();
  savedData[type] = newObj;

  fs.writeFile(savedName, JSON.stringify(savedData), "utf8", function () {
    if (callback != null) callback();
  });
}

function getSavedDataType(type) {
  let savedData = getSavedData();
  return savedData[type];
}

let username = null;

function checkUsername() {
  usernameCheck = true;
  username = getSavedDataType("username");
  if (username != null) {
    socket.emit(events.COMMAND, {
      command: commands.CHANGE_USERNAME,
      username,
    });
  }
}

function changeUsername() {
  usernameCheck = false;
  inquirer
    .prompt([
      {
        message: "New username =>",
        type: "input",
        name: "username",
      },
    ])
    .then(function (answers) {
      let username = answers.username;
      saveDataType("username", username);

      socket.emit(events.COMMAND, {
        command: commands.CHANGE_USERNAME,
        username,
      });
    });
}

function logId() {
  console.log(ascii);
  if (username != null)
    console.log("Connected as: [%s] %s\n", username, socket.id);
  else console.log("Connected as: %s\n", socket.id);
}

function isFile(pathItem) {
  return !!path.extname(pathItem);
}

function isEmpty(obj) {
  return Object.keys(obj).length === 0;
}

function clearLine() {
  readline.clearLine(process.stdout, 0);
  readline.cursorTo(process.stdout, 0);
}

function clearConsole() {
  process.stdout.write("\x1B[2J\x1B[0f");
}

function waitForKey(callback) {
  console.log("Press any key to continue.");
  process.stdin.resume();
  process.stdin.once("data", function () {
    callback();
  });
}

function printTitle(title) {
  console.log("\n%s", title);
  console.log("---------------");
}

function printEnd() {
  console.log("---------------\n");
}

function printMessages() {
  printTitle("Messages");
  if (messages.length) {
    messages.forEach((data) => {
      console.log("%s: %s", getUserString(data.fromUser), data.message);
    });
  } else {
    console.log("No new messages");
  }
  printEnd();
  waitForKey(promptCommands);
}

function promptCommands() {
  clearConsole();
  logId();
  inquirer
    .prompt([
      {
        message: "What do you want to do?",
        type: "list",
        choices: [
          commands.CHANGE_USERNAME,
          commands.LIST_USERS,
          commands.VIEW_MESSAGES,
          commands.SHARE,
          commands.SHARE_REMOVE,
          commands.CONNECT,
          commands.EXIT,
        ],
        name: "command",
      },
    ])
    .then(function (answers) {
      clearConsole();
      switch (answers.command) {
        case commands.CHANGE_USERNAME:
          changeUsername();
          break;
        case commands.CONNECT:
          promptConnect();
          break;
        case commands.VIEW_MESSAGES:
          printMessages();
          break;
        case commands.SHARE:
          selectDirectories("./");
          break;
        case commands.SHARE_REMOVE:
          removeDirectories();
          break;
        case commands.EXIT:
          process.exit(0);
          break;
        default:
          socket.emit(events.COMMAND, {
            command: answers.command,
          });
          break;
      }
    });
}

function getUserString(user) {
  let string = "";
  if (user.username != null) string = "[" + user.username + "] ";
  string += user.id;
  return string;
}

function getUserStrings(users) {
  let strings = [];
  users.forEach(function (user) {
    strings.push(getUserString(user));
  });
  return strings;
}

function listUsers(users) {
  printTitle("Users connected");
  let strings = getUserStrings(users);
  strings.forEach((user) => {
    console.log(user);
  });
  printEnd();
  waitForKey(promptCommands);
}

function getDirectories() {
  let dirs = getSavedDataType("directories");
  if (dirs != null) return dirs;
  return [];
}

function saveDirectory(path) {
  clearConsole();
  let dirs = getDirectories();
  if (dirs.includes(path)) {
    console.log("You have already shared this directory.\n");
    waitForKey(promptCommands);
    return;
  }
  dirs.push(path);
  saveDataType("directories", dirs, function () {
    console.log("\nSaved path '%s'\n", path);
    waitForKey(promptCommands);
  });
}

function selectDirectories(rootPath) {
  inquirer
    .prompt([
      {
        type: "directory",
        name: "path",
        basePath: rootPath,
        message: "Select a directory",
      },
    ])
    .then((directory) => {
      if (directory.path == rootPath) {
        if (directory.path == ".") rootPath += ".";
        else rootPath += "/..";
        selectDirectories(rootPath);
      } else {
        let savePath = path.resolve(directory.path);
        saveDirectory(savePath);
      }
    });
}

function removeDirectories() {
  clearConsole();
  let dirs = getDirectories();
  if (dirs.length === 0) {
    console.log("You have not shared any directories yet.\n");
    waitForKey(promptCommands);
    return;
  }

  let cancel = "(Go back)";
  dirs.unshift(cancel);

  inquirer
    .prompt([
      {
        message: "Which directory do you want to remove?",
        type: "list",
        choices: dirs,
        name: "directory",
      },
    ])
    .then(function (answers) {
      dirs.shift();

      if (answers.directory === cancel) {
        promptCommands();
      } else {
        dirs = dirs.filter((dir) => dir != answers.directory);
        saveDataType("directories", dirs, () => {
          console.log("\nDirectory is no longer shared.\n");
          waitForKey(promptCommands);
        });
      }
    });
}

function promptUserCommands() {
  clearConsole();
  inquirer
    .prompt([
      {
        message:
          "How do you want to interact with " +
          getUserString(connectedUser) +
          "?",
        type: "list",
        choices: [commands.MESSAGE, commands.BROWSE, commands.LEAVE],
        name: "command",
      },
    ])
    .then(function (answers) {
      switch (answers.command) {
        case commands.MESSAGE:
          messageConnectedUser();
          break;
        case commands.BROWSE:
          socket.emit(events.BROWSE, {
            targetId: connectedUser.id,
          });
          break;
        case commands.LEAVE:
          connectedUser = null;
          promptCommands();
          break;
      }
    });
}

function messageConnectedUser() {
  inquirer
    .prompt([
      {
        message: "=>",
        type: "input",
        name: "message",
      },
    ])
    .then(function (answers) {
      socket.emit(events.MESSAGE, {
        message: answers.message,
        targetId: connectedUser.id,
      });
      promptUserCommands();
    });
}

let userResults = [];

function searchId(searchTerm) {
  return new Promise(function (resolve, reject) {
    socket.emit(events.SEARCH_ID, searchTerm);
    socket.once(events.SEARCH_ID_RESPONSE, function (users) {
      resolve(users);
    });
  });
}

let foundUsers = null;
let userStrings = null;
let connectedUser = null;

function promptConnect() {
  inquirer
    .prompt([
      {
        name: "userString",
        message: "Who do you want to connect to?",
        type: "autocomplete",
        source: function (answers, input) {
          if (input == null) return [];
          return searchId(input).then(function (users) {
            foundUsers = users;
            userStrings = getUserStrings(users);
            return userStrings;
          });
        },
      },
    ])
    .then(function (answers) {
      let user = foundUsers[userStrings.indexOf(answers.userString)];
      connectedUser = user;
      promptUserCommands();
    });
}

let output = null;

function initDownload(path, file) {
  const dir = "./downloads/";
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

  output = fs.createWriteStream(dir + file, {
    flags: "w",
  });

  output.on("open", function () {
    socket.emit(events.DOWNLOAD, {
      targetId: connectedUser.id,
      path,
      file,
    });
  });
}

socket.on(events.DOWNLOAD, (data) => {
  const filePath = path.resolve(data.path, data.file);
  const readStream = fs.createReadStream(filePath);

  const totalBytes = fs.statSync(filePath).size;

  readStream.on("data", function (chunk) {
    let progress = readStream.bytesRead / totalBytes;
    const done = progress == 1;

    socket.emit(events.DOWNLOAD_CHUNK, {
      targetId: data.fromUser.id,
      file: data.file,
      progress,
      done,
      chunk,
    });
  });
});

socket.on(events.DOWNLOAD_CHUNK, (data) => {
  output.write(data.chunk);

  clearLine();
  process.stdout.write(Math.round(data.progress * 100) + "% done");

  if (data.done == true) {
    clearLine();
    console.log("\nFinished downloading: %s\n", data.file);
    waitForKey(promptUserCommands);
  }
});

socket.on(events.BROWSE_PATH, (data) => {
  let files = [];
  fs.readdir(data.path, function (err, items) {
    items.forEach(function (item) {
      const filePath = data.path + "/" + item;
      try {
        if (fs.statSync(filePath).isFile()) files.push(item);
      } catch (err) {
        console.log("File not found.");
      }
    });
    socket.emit(events.BROWSE_PATH_RESPONSE, {
      targetId: data.fromUser.id,
      path: data.path,
      files,
    });
  });
});

socket.on(events.BROWSE_PATH_RESPONSE, (data) => {
  clearConsole();
  if (isEmpty(data.files)) {
    console.log("This directory is empty...\n");
    waitForKey(promptUserCommands);
    return;
  }
  inquirer
    .prompt([
      {
        message: "Select a file to download",
        type: "list",
        choices: data.files,
        name: "file",
      },
    ])
    .then(function (answers) {
      initDownload(data.path, answers.file);
    });
});

socket.on(events.BROWSE, (data) => {
  socket.emit(events.BROWSE_RESPONSE, {
    targetId: data.fromUser.id,
    directories: getDirectories(),
  });
});

socket.on(events.BROWSE_RESPONSE, (data) => {
  clearConsole();
  if (isEmpty(data.directories)) {
    console.log("%s has no directories\n", getUserString(connectedUser));
    waitForKey(promptUserCommands);
    return;
  }
  console.log("Directories of %s\n", getUserString(connectedUser));
  inquirer
    .prompt([
      {
        message: "Select a directory",
        type: "list",
        choices: data.directories,
        name: "path",
      },
    ])
    .then(function (answers) {
      socket.emit(events.BROWSE_PATH, {
        targetId: connectedUser.id,
        path: answers.path,
      });
    });
});

let messages = [];

socket.on(events.MESSAGE_RECEIVED, (message) => {
  messages.push(message);
});

socket.on(events.COMMAND_RESPONSE, (response) => {
  switch (response.command) {
    case commands.LIST_USERS:
      listUsers(response.data);
      break;
    case commands.CONNECT:
      if (response.data != false) {
        connectedUser = response.data;
        promptUserCommands();
      } else {
        clearConsole();
        console.log("\nNo user found with that ID\n");
        waitForKey(promptCommands);
      }
      break;
    case commands.CHANGE_USERNAME:
      if (usernameCheck == true) break;
      if (response.data != false) {
        username = response.data;
        console.log("\nUsername changed to [%s]\n", username);
      } else {
        console.log("\nUnable to change username\n");
      }
      waitForKey(promptCommands);
      break;
  }
});

let usernameCheck = true;

socket.on("connect", () => {
  console.log("asdf");
  checkUsername();
  promptCommands();
});

// on reconnection, reset the transports option, as the Websocket
// connection may have failed (caused by proxy, firewall, browser, ...)
socket.on("reconnect_attempt", () => {
  socket.io.opts.transports = ["polling", "websocket"];
});
