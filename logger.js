const { createLogger, format, transports } = require('winston');
const path = require('path');

const logFormat = format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(({ timestamp, level, message }) => {
        return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    })
);

const logger = createLogger({
    level: 'info',
    format: logFormat,
    transports: [
        // Console output
        new transports.Console(),

        // File output for all logs
        new transports.File({
            filename: path.join(__dirname, 'logs', 'server.log'),
            level: 'info'
        }),

        // File output for error logs only
        new transports.File({
            filename: path.join(__dirname, 'logs', 'error.log'),
            level: 'error'
        })
    ]
});

module.exports = logger;