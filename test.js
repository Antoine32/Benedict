const socket = require('socket.py');

socket.on('channel_1', (data) => {
    console.log(data);
});
