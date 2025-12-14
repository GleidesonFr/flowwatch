const WebSocket = require('ws');

let wss = null;

function initWebSocket(server) {
    wss = new WebSocket.Server({ server });

    wss.on('connection', (ws) => {
        console.log('New client connected');

        ws.send(JSON.stringify({
            type: "connection",
            message: "FlowWatch WebSocket connected",
            timestamp: Date.now()
        }));
    });
}

function broadcast(event) {
    if (!wss) {
        return;
    }

    const data = JSON.stringify(event);

    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
}

module.exports = {
    initWebSocket,
    broadcast
};