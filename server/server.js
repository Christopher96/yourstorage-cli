const constants = require('constants')
const commands = constants.commands
const events = constants.events

const port = process.env.PORT || 3000

// const express = require('express')
// const app = express()
//
// app.get('/', (req, res) => res.send('Hello World!'))
// app.listen(port, () => console.log(`Example app listening on port ${port}!`))
//
// const server = require('http').createServer(app)
const io = require('socket.io')(port)

io.on('connection', (socket) => {
    console.log("Client detected [%s]", socket.id)

    socket.on(events.MESSAGE, function(data) {
        console.log("[%s] -> [%s] Message: %s", socket.id, data.targetUser, data.message);
        socket.to(data.targetUser).emit(events.MESSAGE_RECEIVED, {
            fromUser: socket.id,
            message: data.message
        })
    })

    socket.on(events.COMMAND, function(data) {
        console.log('[%s] Command: %s', socket.id, data.command)

        let response = false

        switch(data.command) {
            case commands.LIST_USERS:
                response = fetchUsers()
                break;
            case commands.CONNECT:
                const users = fetchUsers()
                if(users.includes(data.targetUser)) {
                    response = data.targetUser
                }
                break;
        }

        socket.emit(events.COMMAND_RESPONSE, {
            command: data.command,
            data: response
        })
    })

    function passThrough(event) {
        socket.on(event, function(data) {
            data.fromUser = socket.id
            const targetUser = data.targetUser
            delete data.targetUser

            socket.to(targetUser).emit(event, data)
        })
    }

    passThrough(events.BROWSE)
    passThrough(events.BROWSE_RESPONSE)
    passThrough(events.BROWSE_PATH)
    passThrough(events.BROWSE_PATH_RESPONSE)
    passThrough(events.DOWNLOAD)
    passThrough(events.DOWNLOAD_CHUNK)
    //
    // socket.on(events.BROWSE, function(targetUser) {
    //     socket.to(targetUser).emit(events.BROWSE, socket.id)
    // })
    //
    // socket.on(events.BROWSE_RESPONSE, function(data) {
    //     socket.to(data.targetUser).emit(events.BROWSE_RESPONSE, {
    //         fromUser: socket.id,
    //         path: data.path,
    //         files: data.files
    //     })
    // })
    //
    // socket.on(events.BROWSE_PATH, function(data) {
    //     socket.to(data.targetUser).emit(events.BROWSE_PATH, {
    //         fromUser: socket.id,
    //         path: data.path
    //     })
    // })
    //
    // socket.on(events.BROWSE_PATH_RESPONSE, function(data) {
    //     socket.to(data.targetUser).emit(events.BROWSE_PATH_RESPONSE, {
    //         fromUser: socket.id,
    //         files: data.files
    //     })
    // })
    //
    // socket.on(events.DOWNLOAD, function(data) {
    //     socket.to(data.targetUser).emit(events.DOWNLOAD, {
    //
    //     })
    // })

    socket.on('disconnected', () => {
        console.log('user disconnected')
    })
})


function fetchUsers() {
    const users = Object.keys(io.sockets.connected)
    return users
}

