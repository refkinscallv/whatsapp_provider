'use strict'

/**
 * Application Configuration
 * Contains all configuration settings for the framework
 */

const path = require('path')
const Env = require('@core/helpers/env.helper')

module.exports = {
    // Application settings
    app: {
        production: Env.getBool('NODE_ENV', 'development') === 'production',
        port: Env.getInt('APP_PORT', 3030),
        url: Env.get('APP_URL', 'http://localhost:3030'),
        name: Env.get('APP_NAME', 'Node Framework'),
        timezone: Env.get('APP_TIMEZONE', 'Asia/Jakarta'),
        log_dir: Env.get('LOG_DIR', 'logs'),
        // Mode: SAAS, NO_SUBSCRIPTION, DASHBOARD
        mode: Env.get('APP_MODE', 'SAAS'),
        // Master Key for Server-to-Server communication
        master_key: Env.get('MASTER_API_KEY', 'master_secret_key_change_me'),
    },


    // Server configuration
    server: {
        https: Env.getBool('SERVER_HTTPS', false),
        ssl: {
            cert: Env.get('SERVER_SSL_CERT_PATH', path.join(__dirname, '/path/to/ssl.cert')),
            key: Env.get('SERVER_SSL_KEY_PATH', path.join(__dirname, '/path/to/ssl.key')),
        },
        options: {
            poweredBy: false,
            maxHeaderSize: 16384,
            keepAliveTimeout: 5000,
            requestTimeout: 300000,
            headersTimeout: 60000,
        },
    },

    // Express configuration
    express: {
        trustProxy: true,
        cors: {
            origin: (origin, callback) => callback(null, true),
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD', 'CONNECT', 'TRACE'],
            allowedHeaders: [
                'X-Requested-With',
                'X-Custom-Header',
                'Content-Type',
                'Authorization',
                'Accept',
                'Origin',
                'Access-Control-Allow-Origin',
                'Access-Control-Allow-Headers',
                'Access-Control-Request-Method',
                'Access-Control-Request-Headers',
            ],
            exposedHeaders: ['Content-Range', 'X-Content-Range', 'X-Custom-Header'],
            credentials: true,
            maxAge: 86400,
            preflightContinue: false,
            optionsSuccessStatus: 200,
        },
        static: {
            status: true,
            alias: '/',
            path: path.join(__dirname, '../public'),
        },
        view: {
            status: true,
            engine: 'ejs',
            path: path.join(__dirname, '../public/views'),
        },
        fileupload: {
            useTempFiles: true,
            tempFileDir: Env.get('UPLOAD_TEMP_DIR', path.join(__dirname, '../tmp/')),
            createParentPath: true,
            limits: {
                fileSize: Env.getInt('UPLOAD_MAX_SIZE', 50 * 1024 * 1024), // 50MB max file size
            },
            abortOnLimit: true,
            responseOnLimit: 'File size limit has been reached',
            uploadTimeout: 60000,
            debug: false,
        },
    },

    // Socket.IO configuration
    socket: {
        options: {
            cors: {
                origin: '*',
                methods: ['GET', 'POST'],
                credentials: true,
            },
            pingInterval: 25000,
            pingTimeout: 60000,
            maxHttpBufferSize: 1e6,
            transports: ['websocket', 'polling'],
            allowUpgrades: true,
        },
    },

    // Database configuration
    database: {
        status: Env.getBool('DB_ENABLED', false),
        dialect: Env.get('DB_DIALECT', 'mysql'),
        host: Env.get('DB_HOST', 'localhost'),
        port: Env.getInt('DB_PORT', 3306),
        database: Env.get('DB_NAME', 'database'),
        username: Env.get('DB_USERNAME', 'root'),
        password: Env.get('DB_PASSWORD', ''),
        logging: Env.getBool('DB_LOGGING', false),
        timezone: Env.get('DB_TIMEZONE', '+07:00'),
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000,
        },
        define: {
            timestamps: true,
            underscored: true,
            freezeTableName: true,
        },
        sync: Env.getBool('DB_SYNC', true),
        force: Env.getBool('DB_FORCE', false),
        alter: Env.getBool('DB_ALTER', false),
    },

    // JWT configuration
    jwt: {
        // WARNING: Change this secret in production!
        // Use a strong, random secret key and store it in environment variables
        secret: Env.get('JWT_SECRET', 'your-secret-key-change-this-in-production'),
        expiresIn: Env.get('JWT_EXPIRES_IN', '7d'),
    },

    // AI Automation configuration
    ai: {
        headless: Env.getBool('AI_HEADLESS', false),
        chromeExecutable: Env.get('CHROME_EXECUTABLE_PATH', null),
        sessionPath: Env.get('AI_SESSION_PATH', path.join(__dirname, '../browser-sessions')),
        userAgent: Env.get('AI_USER_AGENT', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'),
        stableDuration: Env.getInt('AI_STABLE_DURATION', 3000),
        checkInterval: Env.getInt('AI_CHECK_INTERVAL', 1000),
        timeout: Env.getInt('AI_TIMEOUT', 90000),
        sessionTimeout: Env.getInt('AI_SESSION_TIMEOUT', 3600000), // 1 hour
    },

    // Mailer configuration
    mailer: {
        host: Env.get('MAIL_HOST', 'smtp.gmail.com'),
        port: Env.getInt('MAIL_PORT', 587),
        secure: Env.getBool('MAIL_SECURE', false),
        auth: {
            user: Env.get('MAIL_USER', 'your-email@gmail.com'),
            pass: Env.get('MAIL_PASSWORD', 'your-app-password'),
        },
        from: {
            name: Env.get('MAIL_FROM_NAME', 'Node Framework'),
            email: Env.get('MAIL_FROM_EMAIL', 'noreply@example.com'),
        },
    },
}
