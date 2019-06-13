const constants = require('./constants')
const commands = constants.commands
const events = constants.events

const fs = require('fs')
const path = require('path')
const readline = require('readline')
const io = require('socket.io-client');

const inquirer = require('inquirer')
inquirer.registerPrompt('fuzzypath', require('inquirer-fuzzy-path'))


let local = true
const serverUrl = (local) ? "http://localhost:3000" : "https://yourstorage.herokuapp.com"

const socket = io(serverUrl, {
    transports: ['websocket']
});

function isFile(pathItem) {
    return !!path.extname(pathItem);
}

function clearLine() {
    readline.clearLine(process.stdout, 0)
    readline.cursorTo(process.stdout, 0)
}

function clearConsole() {
    console.log('\033c')
}

function waitForKey(callback) {
    console.log('Press any key to continue.')
    process.stdin.resume()
    process.stdin.once('data', function () {
        callback()
    })
}

function printTitle(title) {
    console.log("\n%s", title)
    console.log("---------------")
}

function printEnd() {
    console.log("---------------\n")
}

function printMessages() {
    printTitle("Messages")
    if(messages.length) {
        messages.forEach(data => {
            console.log("[%s]: %s", data.fromUser, data.message)
        })
    } else {
        console.log("No new messages")
    }
    printEnd()
    waitForKey(promptCommands)
}

function promptCommands() {
    clearConsole()
    console.log("ID: %s\n", socket.id)
    inquirer.prompt([{
        message: 'What do you want to do?',
        type: 'rawlist',
        choices: [ 
            commands.LIST_USERS,
            commands.VIEW_MESSAGES,
            commands.SHARE,
            commands.CONNECT,
            commands.EXIT
        ],
        name: 'command'
    }]).then(function(answers) {
        clearConsole()
        switch(answers.command) {
            case commands.CONNECT:
                promptConnect()
                break;
            case commands.VIEW_MESSAGES:
                printMessages()
                break;
            case commands.SHARE:
                selectDirectories('.')
                break;
            case commands.EXIT:
                process.exit(0)
                break;
            default:
                socket.emit(events.COMMAND,  {
                    command: answers.command
                })
                break;
        }
    })
}

function listUsers(users) {
    printTitle("Users connected")
    users.forEach(function(user) {
        console.log(user);
    })
    printEnd()
    waitForKey(promptCommands)
}


function selectDirectories(rootPath) {
    inquirer.prompt([{
        type: 'fuzzypath',
        name: 'path',
        excludePath: nodePath => {
            const exclude = nodePath.includes('node_modules') || nodePath.includes('.git')
            return exclude 
        },
        itemType: 'directory',
        rootPath,
        message: 'Select a directory:',
        suggestOnly: false,
    }]).then(directory => {
        if(directory.path == rootPath) {
            if(directory.path == '.') rootPath += '.'
            else rootPath += '/..'
            selectDirectories(rootPath)
        } else {
            let savePath = path.resolve(directory.path)
            saveDirectory(savePath)
        }
    })
}

function getDirectories() {
    let directories = []
    try {
        directories = require('./directories.json')
    } catch(e) {}
    return directories
}

function saveDirectory(path) {
    let directories = getDirectories()
    directories.push(path)
    fs.writeFile( "directories.json", JSON.stringify( directories ), "utf8", function() {
        console.log("Shared directories")
        console.log(directories)
        console.log()
        waitForKey(promptCommands)
    })

}

function promptUserCommands() {
    clearConsole()
    inquirer.prompt([{
        message: 'How do you want to interact with ['+connectedUser+']?',
        type: 'rawlist',
        choices: [
            commands.MESSAGE,
            commands.BROWSE,
            commands.LEAVE
        ],
        name: 'command'
    }]).then(function(answers) {
        switch(answers.command) {
            case commands.MESSAGE:
                messageConnectedUser()
                break;
            case commands.BROWSE:
                socket.emit(events.BROWSE, {
                    targetUser: connectedUser
                })
                break;
            case commands.LEAVE:
                connectedUser = 0
                promptCommands()
                break;
        }
    })
}

function messageConnectedUser() {
    inquirer.prompt([{
        message: '=>',
        type: 'input',
        name: 'message'
    }]).then(function(answers) {
        socket.emit(events.MESSAGE, {
            message: answers.message,
            targetUser: connectedUser
        })
        promptUserCommands()
    })

}

let connectedUser = 0

function promptConnect() {
    inquirer.prompt([{
        message: 'Who do you want to connect to? [ID]',
        type: 'input',
        name: 'userId'
    }]).then(function(answers) {
        socket.emit(events.COMMAND, {
            command: commands.CONNECT,
            targetUser: answers.userId
        })
    })
}

let output = null

function initDownload(path, file) {
    const dir = './downloads/';
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
    }

    output = fs.createWriteStream(dir+file, {
        flags: 'w'
    })

    output.on('ready', function() {
        socket.emit(events.DOWNLOAD, {
            targetUser: connectedUser,
            path,
            file
        })
    })
}

socket.on(events.DOWNLOAD, (data) => {
    const filePath = path.resolve(data.path, data.file)
    const readStream = fs.createReadStream(filePath)

    const totalBytes = fs.statSync(filePath).size

    readStream.on('data', function(chunk) {
        let progress = readStream.bytesRead / totalBytes
        const done = (progress == 1)

        socket.emit(events.DOWNLOAD_CHUNK, {
            targetUser: data.fromUser,
            file: data.file,
            progress,
            done,
            chunk
        })
    })
})


socket.on(events.DOWNLOAD_CHUNK, (data) => {
    output.write(data.chunk)

    clearLine()
    process.stdout.write(Math.round(data.progress * 10) + "% done")

    if(data.done == true) {
        clearLine()
        console.log("Finished downloading: %s\n", data.file)
        waitForKey(promptUserCommands)
    }
})

socket.on(events.BROWSE_PATH, (data) => {
    let files = []
    fs.readdir(data.path, function(err, items) {
        items.forEach(function(item) {
            const filePath = data.path+'/'+item
            try {
                if(fs.statSync(filePath).isFile())
                    files.push(item)
            }
            catch(err) {
                console.log("File not found.")
            }
        })
        socket.emit(events.BROWSE_PATH_RESPONSE, { 
            targetUser: data.fromUser,
            path: data.path,
            files
        })
    })
})

socket.on(events.BROWSE_PATH_RESPONSE, (data) => {
    console.log("browse response")
    inquirer.prompt([{
        message: 'Select a file to download',
        type: 'rawlist',
        choices: data.files,
        name: 'file'
    }]).then(function(answers) {
        initDownload(data.path, answers.file)
    })
})

socket.on(events.BROWSE, (data) => {
    socket.emit(events.BROWSE_RESPONSE, {
        targetUser: data.fromUser,
        files: getDirectories()
    })
})

socket.on(events.BROWSE_RESPONSE, (data) => {
    clearConsole()
    console.log("Directories of [%s]", data.fromUser)
    inquirer.prompt([{
        message: 'Select a directory',
        type: 'rawlist',
        choices: data.files,
        name: 'path'
    }]).then(function(answers) {
        socket.emit(events.BROWSE_PATH, {
            targetUser: connectedUser,
            path: answers.path
        })
    })
})

let messages = [];

socket.on(events.MESSAGE_RECEIVED, (message) => {
    messages.push(message)
})

socket.on(events.COMMAND_RESPONSE, (response) => {
    switch(response.command) {
        case commands.LIST_USERS:
            listUsers(response.data);
            break;
        case commands.CONNECT:
            if(response.data != false) {
                connectedUser = response.data
                promptUserCommands()
            } else {
                clearConsole()
                console.log("\nNo user found with that ID\n")
                waitForKey(promptCommands)
            }
            break;
    }
})

socket.on('connect', () => {
    promptCommands();
})

// on reconnection, reset the transports option, as the Websocket
// connection may have failed (caused by proxy, firewall, browser, ...)
socket.on('reconnect_attempt', () => {
    socket.io.opts.transports = ['polling', 'websocket'];
});
