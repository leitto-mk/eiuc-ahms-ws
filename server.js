require('dotenv').config();

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

            server.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        channel: channel,
                        data: JSON.parse(data)
                    }));
                } else if (client.readyState === WebSocket.CLOSED || client.readyState === WebSocket.CLOSING) {
                    logger.warn('Client is closed, skipping send');
                } else {
                    logger.warn('Client is in an unknown state, skipping send');
                }
            });
        });
    }
}).catch(err => {
    logger.error(`Redis connection failed: ${err.message}`);
});

server.on('connection', (ws, request) => {
    const origin = `${request.socket.remoteAddress} -- ${request.headers['user-agent']}`
    logger.info(`Client connected from: ${origin}`);

    ws.on('close', () => {
        logger.info('Client disconnected');
    });
});