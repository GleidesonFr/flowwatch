require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const Redis = require('ioredis');

const { initWebSocket, broadcast } = require('./websocket');
const { time } = require('console');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());

//Redis client
const redis = new Redis();

const LOCK_PREFIX = 'flowwatch:lock:';

initWebSocket(server);

async function setLock(filePath, user, ttl = 5 * 60 * 1000) { 
    const key = LOCK_PREFIX + filePath;
    const value = JSON.stringify({ user, ts: Date.now() });

    //usa PX TTL em ms e NX para only-if-not-exists
    const res = await redis.set(key, value, 'PX', ttl, 'NX');
    return res === 'OK';
}

async function releaseLock(filePath, user) {
    const key = LOCK_PREFIX + filePath;
    const value = await redis.get(key);
    
    if(!value){
        return false;
    }

    try {
        const obj = JSON.parse(value);

        if(obj.user === user){
            await redis.del(key);
            return true;
        }
        return false;
    } catch (error) {
        await redis.del(key);
        return true;
    }
}

async function getLock(filePath) {
    const key = LOCK_PREFIX + filePath;
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
}

app.post("/lock", async (req, res) => {
    const { path, user } = req.body;

    if(!path || !user){
        return res.status(400).send('path & user required');
    }

    const ok = await setLock(path, user);

    if(ok){
        io.emit('lock', { path, user });
        broadcast({
            type: "lock",
            path: path,
            user: user,
            timestamp: Date.now()
        });

        return res.json(
            {
                success: true,
                data: {
                    path: path,
                    locked_by: user
                },
                error: null,
                timestamp: Date.now()
            }
        );
    }else{
        const current = await getLock(path);
        return res.status(409).json({
            success: false,
            data: null,
            error: {
                code: "FILE_LOCKED",
                message: "O arquivo está sendo usado por outro usuário",
                details: {
                    lockedBy: current.user
                }
            },
            timestamp: current.ts
        });
    }
});

app.post('/unlock', async (req, res) =>{
   const { path, user } = req.body;
   
   if(!path || !user){
    return res.status(400).send('path & send required');
   }

   const ok = await releaseLock(path, user);

   if(ok){
    io.emit('unlock', { path, user });

    broadcast({
        type: "unlock",
        path: path,
        user: user,
        timestamp: Date.now()
    });

    return res.json({
        success: true,
        data: {
            unlocked: true,
            path: path
        },
        error: null
    });
   }else{
    return res.status(403).json({
        success: false,
        data: {
            unlocked: false,
            path: path
        },
        error: "Não é o proprietário ou não está bloqueado"
    });
   }
});

app.get('/locks', async (req, res) => {
    // Para MVP, varrer keys
    const keys =await redis.keys(LOCK_PREFIX + '*');
    const list = [];

    for(const key of keys){
        const val = await redis.get(key);
        list.push({key:key.replace(LOCK_PREFIX, ''), val:JSON.parse(val)});
    }

    res.json(list);
})

app.post('/event', (req, res) => {
    const { path, action, user } = req.body;
    io.emit('file-event', { path, action, user });
    res.json({ok:true});
});

io.on('connection', socket => {
    console.log('socket connected', socket.id);
    socket.on('hello', data => console.log('hello from client', data));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`FlowWatch API listening on ${PORT}`));