const WebSocket = require('ws');
const vscode = require('vscode');

let ws = null;

function connectWebSocket() {
    const config = vscode.workspace.getConfiguration('flowwatch');
    const url = config.get("serverUrl").replace("http", "ws");

    ws = new WebSocket(url);

    ws.on("open", () => {
        console.log("FlowWatch WebSocket connected");
    });

    ws.on("message", (msg) => {
        const event = JSON.parse(msg.toString());

        if(event.type === "lock"){
            vscode.window.showInformationMessage(`${event.path} está bloqueado por ${event.user}`);
        }

        if(event.type === "unlock"){
            vscode.window.showInformationMessage(`${event.path} está desbloqueado`);
        }
    });

    ws.on("close", () => {
        console.log("FlowWatch WebSocket disconnected");
    });
}

module.exports = {
    connectWebSocket
};