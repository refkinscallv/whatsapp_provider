# Framework API Documentation

Complete API reference for the Node.js MVC Framework.

## Table of Contents

- [Core Modules](#core-modules)
    - [Boot](#boot)
    - [Database](#database)
    - [Express](#express)
    - [Logger](#logger)
    - [JWT](#jwt)
    - [Mailer](#mailer)
    - [Hooks](#hooks)
    - [Socket](#socket)
    - [Server](#server)
    - [Runtime](#runtime)
    - [ErrorHandler](#errorhandler)

---

## Core Modules

### Boot

The Boot module is responsible for starting the application and managing its lifecycle.

#### Methods

##### `Boot.start()`

Starts the application by initializing all core modules in sequence.

```javascript
const Boot = require('@core/boot.core')
await Boot.start()
```

**Returns:** `Promise<void>`

**Throws:** Error if application fails to start

---

### Database

Manages database connections and Sequelize models.

#### Methods

##### `Database.init()`

Initializes database connection and loads models.

```javascript
const Database = require('@core/database.core')
await Database.init()
```

**Returns:** `Promise<void>`

##### `Database.getModel(name)`

Retrieves a loaded Sequelize model by name.

```javascript
const User = Database.getModel('User')
const users = await User.findAll()
```

**Parameters:**

- `name` (string): Model name

**Returns:** Sequelize Model instance

##### `Database.getInstance()`

Gets the Sequelize instance.

```javascript
const sequelize = Database.getInstance()
await sequelize.query('SELECT * FROM users')
```

**Returns:** Sequelize instance

##### `Database.close()`

Closes the database connection.

```javascript
await Database.close()
```

**Returns:** `Promise<void>`

> **Note**: Since v1.0.5, this method is async and must be awaited.

#### Properties

##### `Database.models`

Object containing all loaded models.

```javascript
const models = Database.models
console.log(Object.keys(models)) // ['User', 'Post', ...]
```

---

### Express

Manages Express application and middleware configuration.

#### Methods

##### `Express.init()`

Initializes Express app with middlewares and routes.

```javascript
const Express = require('@core/express.core')
Express.init()
```

**Returns:** `void`

##### `Express.instance()`

Gets the Express application instance.

```javascript
const app = Express.instance()
app.get('/custom', (req, res) => {
    res.send('Custom route')
})
```

**Returns:** Express application

#### Properties

##### `Express.app`

The Express application instance.

```javascript
const app = Express.app
```

##### `Express.router`

The Express Router instance.

```javascript
const router = Express.router
```

---

### Logger

Winston-based logging system with file rotation.

#### Methods

##### `Logger.info(context, message)`

Logs informational messages.

```javascript
const Logger = require('@core/logger.core')
Logger.info('user', 'User logged in successfully')
```

**Parameters:**

- `context` (string): Log context/layer
- `message` (string): Log message

##### `Logger.error(context, message)`

Logs error messages.

```javascript
Logger.error('database', 'Connection failed')
```

**Parameters:**

- `context` (string): Error context
- `message` (string): Error message

##### `Logger.warn(context, message)`

Logs warning messages.

```javascript
Logger.warn('auth', 'Invalid token attempt')
```

**Parameters:**

- `context` (string): Warning context
- `message` (string): Warning message

##### `Logger.debug(context, message)`

Logs debug messages (only in development).

```javascript
Logger.debug('query', 'SELECT * FROM users')
```

**Parameters:**

- `context` (string): Debug context
- `message` (string): Debug message

##### `Logger.set(error, context)`

Logs error objects with stack traces.

```javascript
try {
    // some code
} catch (err) {
    Logger.set(err, 'controller')
}
```

**Parameters:**

- `error` (Error): Error object
- `context` (string): Error context

---

### JWT

JSON Web Token utilities for authentication.

#### Methods

##### `JWT.sign(payload, expiresIn)`

Creates a JWT token.

```javascript
const JWT = require('@core/jwt.core')

const token = JWT.sign({ userId: 123, role: 'admin' }, '7d')
```

**Parameters:**

- `payload` (Object): Token payload data
- `expiresIn` (string, optional): Expiration time (default from config)

**Returns:** `string` - JWT token

##### `JWT.verify(token)`

Verifies and decodes a JWT token.

```javascript
const decoded = JWT.verify(token)
if (decoded) {
    console.log(decoded.userId) // 123
}
```

**Parameters:**

- `token` (string): JWT token to verify

**Returns:** `Object|null` - Decoded payload or null if invalid

##### `JWT.decode(token)`

Decodes a JWT token without verification.

```javascript
const decoded = JWT.decode(token)
console.log(decoded)
```

**Parameters:**

- `token` (string): JWT token

**Returns:** `Object|null` - Decoded payload or null

---

### Mailer

Email sending functionality with template support.

#### Methods

##### `Mailer.init()`

Initializes the mailer transport.

```javascript
const Mailer = require('@core/mailer.core')
Mailer.init()
```

**Returns:** `void`

##### `Mailer.send(to, subject, template, data)`

Sends an email using an EJS template.

```javascript
await Mailer.send('user@example.com', 'Welcome to Our App', 'welcome', { username: 'John Doe' })
```

**Parameters:**

- `to` (string): Recipient email
- `subject` (string): Email subject
- `template` (string): Template name (without .email.ejs extension)
- `data` (Object): Data to pass to template

**Returns:** `Promise<Object>` - Email info

**Template Location:** `public/views/templates/email/{template}.email.ejs`

##### `Mailer.verify()`

Verifies mailer connection.

```javascript
const isValid = await Mailer.verify()
console.log(isValid) // true or false
```

**Returns:** `Promise<boolean>` - Connection status

---

### Hooks

Lifecycle hooks system for running code at specific points.

#### Methods

##### `Hooks.register(lifecycle, callback)`

Registers a hook callback.

```javascript
const Hooks = require('@core/hooks.core')

Hooks.register('before', async () => {
    console.log('Before app starts')
})
```

**Parameters:**

- `lifecycle` (string): Hook lifecycle ('before', 'after', 'shutdown')
- `callback` (Function): Async function to execute

**Lifecycles:**

- `before`: Before application initialization
- `after`: After application starts
- `shutdown`: During graceful shutdown

##### `Hooks.run(lifecycle)`

Executes all hooks for a specific lifecycle.

```javascript
await Hooks.run('after')
```

**Parameters:**

- `lifecycle` (string): Hook lifecycle to run

**Returns:** `Promise<void>`

---

### Socket

Socket.IO configuration and management.

#### Methods

##### `Socket.init(server)`

Initializes Socket.IO with the HTTP server.

```javascript
const Socket = require('@core/socket.core')
const server = require('http').createServer(app)
Socket.init(server)
```

**Parameters:**

- `server` (Object): HTTP/HTTPS server instance

**Returns:** `void`

##### `Socket.getInstance()`

Gets the Socket.IO instance.

```javascript
const io = Socket.getInstance()
io.emit('broadcast', { message: 'Hello everyone' })
```

**Returns:** Socket.IO Server instance

#### Properties

##### `Socket.io`

The Socket.IO server instance.

```javascript
const io = Socket.io
```

---

### Server

HTTP/HTTPS server creation and management.

#### Methods

##### `Server.create(app)`

Creates an HTTP or HTTPS server.

```javascript
const Server = require('@core/server.core')
const server = Server.create(expressApp)
```

**Parameters:**

- `app` (Object): Express application instance

**Returns:** HTTP/HTTPS Server instance

##### `Server.listen(server, port)`

Starts the server listening on specified port.

```javascript
await Server.listen(server, 3025)
```

**Parameters:**

- `server` (Object): Server instance
- `port` (number): Port number

**Returns:** `Promise<void>`

---

### Runtime

Runtime environment configuration.

#### Methods

##### `Runtime.init()`

Configures runtime environment (timezone, NODE_ENV).

```javascript
const Runtime = require('@core/runtime.core')
Runtime.init()
```

**Returns:** `void`

---

### ErrorHandler

Global error handling for Express.

#### Methods

##### `ErrorHandler.init(app)`

Initializes global error handler middleware.

```javascript
const ErrorHandler = require('@core/errorHandler.core')
ErrorHandler.init(app)
```

**Parameters:**

- `app` (Object): Express application instance

**Returns:** `void`

---

## File Upload API

Using express-fileupload, files are available in `req.files`.

### Example Usage

```javascript
Routes.post('/upload', ({ req, res }) => {
    // Check if files exist
    if (!req.files || !req.files.file) {
        return res.status(400).json({
            success: false,
            message: 'No file uploaded',
        })
    }

    const file = req.files.file

    // File properties
    console.log(file.name) // Original filename
    console.log(file.mimetype) // MIME type
    console.log(file.size) // File size in bytes
    console.log(file.tempFilePath) // Temp file path

    // Move file to destination
    const uploadPath = __dirname + '/uploads/' + file.name

    file.mv(uploadPath, (err) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'File upload failed',
                error: err,
            })
        }

        res.json({
            success: true,
            message: 'File uploaded successfully',
            filename: file.name,
        })
    })
})
```

### Multiple Files

```javascript
Routes.post('/upload-multiple', ({ req, res }) => {
    if (!req.files || !req.files.files) {
        return res.status(400).json({ error: 'No files uploaded' })
    }

    const files = Array.isArray(req.files.files) ? req.files.files : [req.files.files]

    files.forEach((file) => {
        const uploadPath = __dirname + '/uploads/' + file.name
        file.mv(uploadPath)
    })

    res.json({ message: `${files.length} files uploaded` })
})
```

### File Validation

```javascript
Routes.post('/upload', ({ req, res }) => {
    if (!req.files || !req.files.file) {
        return res.status(400).json({ error: 'No file' })
    }

    const file = req.files.file

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
        return res.status(400).json({ error: 'File too large' })
    }

    // Validate MIME type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif']
    if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({ error: 'Invalid file type' })
    }

    // Process file...
})
```

---

## Routing API

Using `@refkinscallv/express-routing` package.

### Basic Routes

```javascript
const Routes = require('@refkinscallv/express-routing')

// GET route
Routes.get('/users', ({ req, res }) => {
    res.json({ users: [] })
})

// POST route
Routes.post('/users', ({ req, res }) => {
    res.json({ message: 'User created' })
})

// PUT route
Routes.put('/users/:id', ({ req, res }) => {
    res.json({ id: req.params.id })
})

// DELETE route
Routes.delete('/users/:id', ({ req, res }) => {
    res.json({ deleted: true })
})

// PATCH route
Routes.patch('/users/:id', ({ req, res }) => {
    res.json({ updated: true })
})
```

### Route Parameters

```javascript
Routes.get('/users/:id', ({ req, res }) => {
    const userId = req.params.id
    res.json({ userId })
})

Routes.get('/posts/:postId/comments/:commentId', ({ req, res }) => {
    const { postId, commentId } = req.params
    res.json({ postId, commentId })
})
```

### Query Parameters

```javascript
Routes.get('/search', ({ req, res }) => {
    const { q, page, limit } = req.query
    res.json({ query: q, page, limit })
})
// GET /search?q=nodejs&page=1&limit=10
```

### Middleware

```javascript
const authMiddleware = (req, res, next) => {
    if (!req.headers.authorization) {
        return res.status(401).json({ error: 'Unauthorized' })
    }
    next()
}

Routes.get('/protected', authMiddleware, ({ req, res }) => {
    res.json({ message: 'Protected data' })
})
```

### Route Groups

```javascript
// API routes with prefix
Routes.group({ prefix: '/api/v1' }, () => {
    Routes.get('/users', userController.index)
    Routes.post('/users', userController.store)
})
// Results in: /api/v1/users
```

---

## Configuration API

All configuration in `app/config.js`.

### Structure

```javascript
module.exports = {
    app: {
        /* app settings */
    },
    server: {
        /* server settings */
    },
    express: {
        cors: {
            /* CORS options */
        },
        static: {
            /* static files */
        },
        view: {
            /* view engine */
        },
        fileupload: {
            /* file upload options */
        },
    },
    socket: {
        /* Socket.IO options */
    },
    database: {
        /* database settings */
    },
    jwt: {
        /* JWT settings */
    },
    mailer: {
        /* email settings */
    },
}
```

### Accessing Config

```javascript
const config = require('@app/config')

console.log(config.app.port) // 3025
console.log(config.database.host) // localhost
console.log(config.jwt.expiresIn) // 7d
```

---

## Best Practices

1. **Error Handling**: Always use try-catch blocks and log errors
2. **Validation**: Validate user inputs before processing
3. **Security**: Use JWT for authentication, validate file uploads
4. **Logging**: Use appropriate log levels (info, warn, error, debug)
5. **Database**: Use transactions for complex operations
6. **File Uploads**: Validate file types and sizes
7. **Environment**: Use different configs for development/production

---

## Example Application

### User Registration with Email

```javascript
// app/routes/auth.route.js
const Routes = require('@refkinscallv/express-routing')
const Database = require('@core/database.core')
const JWT = require('@core/jwt.core')
const Mailer = require('@core/mailer.core')
const bcrypt = require('bcrypt')

Routes.post('/register', async ({ req, res }) => {
    try {
        const { email, password, name } = req.body

        // Validate input
        if (!email || !password || !name) {
            return res.status(400).json({
                success: false,
                message: 'All fields required',
            })
        }

        // Get User model
        const User = Database.getModel('User')

        // Check if user exists
        const existing = await User.findOne({ where: { email } })
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'Email already registered',
            })
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10)

        // Create user
        const user = await User.create({
            email,
            password: hashedPassword,
            name,
        })

        // Generate JWT
        const token = JWT.sign({ userId: user.id })

        // Send welcome email
        await Mailer.send(email, 'Welcome!', 'welcome', { name })

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
            },
        })
    } catch (err) {
        Logger.set(err, 'auth')
        res.status(500).json({
            success: false,
            message: 'Registration failed',
        })
    }
})
```

---

## Breaking Changes

### Version 1.0.5

#### Database.close() is now async

The `Database.close()` method is now asynchronous and returns a Promise. You must await it:

```javascript
// Before (v1.0.0)
Database.close()

// After (v1.0.5+)
await Database.close()
```

This change ensures database connections are properly closed before the application exits.

---

**Framework Version**: 1.0.5  
**Last Updated**: 2026-02-03

For more examples and detailed guides, see the [README.md](README.md).
