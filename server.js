const { createClient } = require('redis');
const WebSocket = require('ws');

const server = new WebSocket.Server({ port: 8001 });
const redis = createClient();

//Add Channels here
const CHANNELS = [
    'eiuc-notification',
];

redis.connect().then(async () => {
    console.log('Redis connected');

    // Create a dedicated subscriber connection
    const subscriber = redis.duplicate();
    await subscriber.connect();

    // Subscribe to each channel
    for (const channel of CHANNELS) {
        await subscriber.subscribe(channel, (data) => {
            console.log(`Received from Redis [${channel}]: ${data}`);

            // Forward the message to all WebSocket clients
            server.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        channel: channel,
                        contents: JSON.parse(data)
                    }));
                }
            });
        });
    }
});

server.on('connection', ws => {
    console.log('WebSocket client connected');
    ws.on('close', () => {
        console.log('WebSocket client disconnected');
    });
});