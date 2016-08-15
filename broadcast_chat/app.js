"use strict";

const server = require('http').createServer();
const os = require('os').networkInterfaces();
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
const WebSocket = require('ws');

let clients = [];
let port = '';

const hasClient = address => clients.some(target => target.address === address);

const sendMessage = (address, message) => {
    const wsc = new WebSocket(`ws:${address}`);

    wsc.on('open', () => {
        try {
            wsc.send(JSON.stringify(message));
            clients.push({ address, wsc });
        } catch (e) {
            console.log(`Get disconnected from ${address}`);
        }
    });

    wsc.on('error', (e) => {
        console.log('Some error occurred ' + e);
    });
};

if (remoteAddress) {
    setTimeout(() => {
        sendMessage(remoteAddress, {
            type: 'auth',
            address: ownAddress + ':' + port
        });
    });
}


wss.on('connection', ws => {
    ws.on('message', message => {
        const msg = JSON.parse(message);
        const { address } = msg;

        if (msg.type === 'auth') {
            clients.forEach(target => {
                if (target.address === address) {
                    return;
                }

                target.wsc.send(JSON.stringify({ type: 'new_client', address }));
            });

            if (hasClient(address)) {
                return;
            }

            console.log(`New client connected: ${address}`);
            sendMessage(address, { type: 'auth', address: ownAddress + ':' + port });
        }

        if (msg.type === 'new_client') {
            if (hasClient(address)) {
                return;
            }

            console.log(`Connect to ${address}`);
            sendMessage(address, { type: 'auth', address: ownAddress + ':' + port });
        }

        if (msg.type === 'message') {
            console.log(msg.text);
        }
    });
});

setInterval(() =>  {
    let closed = [];

    clients.forEach(target => {
        try {
            target.wsc.send(JSON.stringify({
                type: 'message',
                text: `Sup! message from ${port}`
            }));
        } catch (e) {
            console.log(`Get disconnected from ${target.address}`);
            closed.push(target);
        }
    });

    clients = clients.filter(target => closed.indexOf(target) === -1);
    closed = [];
}, 5000);


server.listen(function () {
    port = server.address().port;
    console.log(`Listening on ${ownAddress}:` + port);
});