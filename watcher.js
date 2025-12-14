require('dotenv').config();
const chokidar = require('chokidar');
const axios = require('axios');
const os = require('os');
const path = require('path');
const { broadcast } = require('./websocket');

const WATCH_PATH = process.env.WATCH_PATH || "C:\\projetos\\sistema"; //ajuste
const API_URL = process.env.API_URL || 'http://localhost:3000/event';
const WATCHER_USER = process.env.WATCHER_USER || os.userInfo().username;

const watcher = chokidar.watch(WATCH_PATH,{
    usePolling: true,
    interval: 300,
    persistent: true,
    ignoreInitial: true,
    ignored: /node_modules/
});

async function sendEvent(filePath, action) {
    try{
        broadcast({
            type: "change",
            path: filePath,
            timestamp: Date.now()
        });

        console.log('Send event', action, filePath);
    }catch(error){
        console.error('Failed to send event', error.message);
    }
}

watcher
    .on('add', p =>sendEvent(p, 'add'))
    .on('change', p => sendEvent(p, 'change'))
    .on('unlink', p => sendEvent(p, 'unlink'))
    .on('addDir', p => sendEvent(p, 'addDir'))
    .on('unlinkDir', p => sendEvent(p, 'unlinkDir'))
    .on('error', error => console.error('Watcher error', error));

    console.log('Watcher started on', WATCH_PATH);