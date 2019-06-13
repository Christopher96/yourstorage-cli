module.exports = {
    commands: {
        LIST_USERS: 'List users',
        VIEW_MESSAGES: 'View messages',
        CONNECT: 'Connect',
        MESSAGE: 'Message',
        SHARE: 'Share files',
        BROWSE: 'Browse files',
        LEAVE: 'Leave',
        EXIT: 'Exit'
    },
    events: {
        MESSAGE: 'message',
        MESSAGE_RECEIVED: 'message_received',
        COMMAND: 'command',
        COMMAND_RESPONSE: 'command_response',
        BROWSE: 'browse',
        BROWSE_RESPONSE: 'browse_response',
        BROWSE_PATH: 'browse_path',
        BROWSE_PATH_RESPONSE: 'browse_path_response',
        DOWNLOAD: 'download',
        DOWNLOAD_CHUNK: 'download_chunk'
    }
}
