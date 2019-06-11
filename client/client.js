const constants = require('../constants')
const commands = constants.commands

const inquirer = require('inquirer')

const io = require('socket.io-client');

let local = true
const serverUrl = (local) ? "http://localhost:3000" : "https://yourstorage.herokuapp.com"

const socket = io(serverUrl, {
    transports: ['websocket']
});

socket.on('connect', () => {
    console.log("ID: %s", socket.id)
    promptCommands();
})

socket.on('message', (message) => {
    console.log("\nReceived: ", message)
})

function promptCommands() {
    inquirer.prompt([{
        message: 'What do you want to do?',
        type: 'rawlist',
        choices: [ 
            commands.LIST_USERS,
            commands.CONNECT
        ],
        name: 'command'
    }]).then(function(answers) {
        socket.emit('command', answers.command)
    })
}

socket.on('command_response', (response) => {
    switch(response.command) {
        case commands.LIST_USERS:
            listUsers(response.data);
            break;
        case commands.CONNECT:
            connect(response.data);
            break;
    }
    promptCommands()
})

function listUsers(users) {
    console.log("\nUsers connected")
    console.log("---------------")
    users.forEach(function(user) {
        console.log(user);
    })
    console.log("---------------\n")
}

function promptUserCommands() {
    inquirer.prompt([{
        message: 'How do you want to interact?',
        type: 'rawlist',
        choices: [
            commands.CHAT,
            commands.BROWSE
        ],
        name: 'command'
    }]).then(function(answers) {
        socket.emit('command', {
            command: answers.command,
            targetUser
        })
    })
}

let targetUser = 0

function connectUser(userId) {
    targetUser = userId
}

// on reconnection, reset the transports option, as the Websocket
// connection may have failed (caused by proxy, firewall, browser, ...)
socket.on('reconnect_attempt', () => {
    socket.io.opts.transports = ['polling', 'websocket'];
});
