require('dotenv').config();

const { v4: uuidv4 } = require('uuid');
const { createClient } = require('redis');
const WebSocket = require('ws');
const logger = require('./logger');

const server = new WebSocket.Server({ port: process.env.WS_PORT });
const redis = createClient();

const CHANNELS = [
    'eiuc-notification', 
    'eiuc-action'
];

redis.connect().then(() => {
    logger.info('Redis connected');

    const subscriber = redis.duplicate();
    subscriber.connect();

    for (const channel of CHANNELS) {
        subscriber.subscribe(channel, (data) => {
            logger.info(`Received from Redis [${channel}]: ${data}`);

            let index = 1;
            server.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        channel: channel,
                        data: JSON.parse(data)
                    }));
                    logger.info(`Client ${index} [${client._meta.id}] message sent ✅`)
                } else if (client.readyState === WebSocket.CLOSED || client.readyState === WebSocket.CLOSING) {
                    logger.warn(`Client ${index} [${client._meta.id}] is closed, skipping send ❌`);
                } else {
                    logger.warn(`Client ${index} [${client._meta.id}] is in an unknown state, skipping send ❌`);
                }

                index++
            });
        });
    }
}).catch(err => {
    logger.error(`Redis connection failed: ${err.message}`);
});

server.on('connection', (ws, request) => {
    const id = uuidv4().replace(/-/g, '').slice(0, 5);
    const ip = request.socket.remoteAddress;
    const userAgent = request.headers['user-agent'] || 'Unknown User Agent';
    const established = new Date().toISOString();

    ws._meta = {
        id,
        ip,
        userAgent,
        established
    };

    const origin = `${request.socket.remoteAddress} -- ${request.headers['user-agent']}`
    logger.info(`Client [${ws._meta.id}] connected from: ${origin}`);

    ws.on('close', () => {
        logger.info(`Client [${ws._meta.id}] disconnected`);
    });
});