"use strict";

const server = require('http').createServer();
const    os = require('os').networkInterfaces();
const WebSocketServer = require('ws').Server;
const wss = new WebSocketServer({ server: server });

const getAddress = () => {
        for (let key of Object.keys(os)) {
            for (let target of os[key]) {
                if (!target.internal && target.family === 'IPv4') {
                    return target.address;
                }
            }
        }
    };

const ownAddress = getAddress();
const remoteAddress = process.argv[2];

let clients = remoteAddress ? [remoteAddress] : [];
const sendMessage = (origin, message) => {
    const WebSocket = require('ws');
    const wsc = new WebSocket(`ws:${origin}`);

    wsc.on('open', () => {
        wsc.send(JSON.stringify(message));
    });

    wsc.on('error', (e) => {
        console.log('Some error occurred ' + e);
    });
};

let port = '';


if (remoteAddress) {
    setTimeout(() => {
        sendMessage(remoteAddress, {
            type: 'auth',
            address: ownAddress + ':' + port
        });
    });
}


wss.on('connection', function connection(ws) {
    ws.on('message', function incoming(message) {
        let msg = JSON.parse(message);

        if (msg.type === 'auth') {
            clients.forEach(client => {
                if (client === msg.address) {
                    return;
                }

                sendMessage(client, {
                    type: 'new_client',
                    address: msg.address
                });
            });
            clients.push(msg.address);
            console.log(`New client connected: ${msg.address}`);
        }

        if (msg.type === 'new_client') {
            if (clients.indexOf(msg.address) !== -1) {
                return;
            }

            sendMessage(msg.address, {
                type: 'auth',
                address: ownAddress + ':' + port
            });
            clients.push(msg.address);
            console.log(`Connect to ${msg.address}`);
        }
    });
});


server.listen(function () {
    port = server.address().port;
    console.log(`Listening on ${ownAddress}:` + port);
});