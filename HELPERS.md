# Helper Classes Documentation

## Available Helpers

The framework provides several helper classes to simplify common tasks:

- **Env** - Environment variable management
- **Url** - URL generation and manipulation
- **Hash** - Hashing and encryption utilities
- **Str** - String manipulation
- **Arr** - Array manipulation

## Usage

```javascript
const { Env, Url, Hash, Str, Arr } = require('@core/helpers')
```

---

## Env Helper

Manage environment variables with type conversion.

### Methods

#### `Env.get(key, defaultValue)`
Get environment variable as string.

```javascript
const appName = Env.get('APP_NAME', 'My App')
```

#### `Env.getInt(key, defaultValue)`
Get environment variable as integer.

```javascript
const port = Env.getInt('APP_PORT', 3000)
```

#### `Env.getBool(key, defaultValue)`
Get environment variable as boolean.

```javascript
const isProduction = Env.getBool('PRODUCTION', false)
```

#### `Env.getArray(key, defaultValue)`
Get environment variable as array (comma-separated).

```javascript
const allowedHosts = Env.getArray('ALLOWED_HOSTS', [])
```

#### `Env.isProduction()`, `Env.isDevelopment()`, `Env.isTest()`
Check current environment.

```javascript
if (Env.isProduction()) {
    // Production-specific code
}
```

---

## Url Helper

Generate and manipulate URLs.

### Methods

#### `Url.to(path)`
Generate full URL from path.

```javascript
Url.to('users/profile') // http://localhost:3030/users/profile
```

#### `Url.asset(path)`
Generate asset URL.

```javascript
Url.asset('images/logo.png') // http://localhost:3030/static/images/logo.png
```

#### `Url.api(path)`
Generate API URL.

```javascript
Url.api('users') // http://localhost:3030/api/users
```

#### `Url.withQuery(path, params)`
Build URL with query parameters.

```javascript
Url.withQuery('search', { q: 'nodejs', page: 1 })
// http://localhost:3030/search?q=nodejs&page=1
```

---

## Hash Helper

Hashing and encryption utilities.

### Methods

#### `Hash.make(value, rounds)`
Hash value using bcrypt.

```javascript
const hashed = await Hash.make('password123')
```

#### `Hash.check(value, hash)`
Verify value against hash.

```javascript
const isValid = await Hash.check('password123', hashedPassword)
```

#### `Hash.md5(value)`, `Hash.sha256(value)`, `Hash.sha512(value)`
Generate hash using different algorithms.

```javascript
const hash = Hash.md5('hello')
```

#### `Hash.random(length)`
Generate random string.

```javascript
const token = Hash.random(32)
```

#### `Hash.uuid()`
Generate UUID v4.

```javascript
const id = Hash.uuid()
```

---

## Str Helper

String manipulation utilities.

### Methods

#### Case Conversion
```javascript
Str.camelCase('hello world')     // helloWorld
Str.snakeCase('helloWorld')      // hello_world
Str.kebabCase('helloWorld')      // hello-world
Str.titleCase('hello world')     // Hello World
```

#### String Operations
```javascript
Str.truncate('Long text...', 10)        // Long te...
Str.slug('Hello World!')                // hello-world
Str.capitalize('hello')                 // Hello
Str.reverse('hello')                    // olleh
Str.random(16)                          // Random string
```

---

## Arr Helper

Array manipulation utilities.

### Methods

#### Array Operations
```javascript
Arr.first([1, 2, 3])                    // 1
Arr.last([1, 2, 3])                     // 3
Arr.unique([1, 2, 2, 3])                // [1, 2, 3]
Arr.flatten([[1, 2], [3, 4]])           // [1, 2, 3, 4]
Arr.chunk([1, 2, 3, 4], 2)              // [[1, 2], [3, 4]]
Arr.shuffle([1, 2, 3, 4])               // Random order
Arr.random([1, 2, 3, 4])                // Random element
```

#### Array of Objects
```javascript
const users = [
    { name: 'John', age: 30 },
    { name: 'Jane', age: 25 }
]

Arr.pluck(users, 'name')                // ['John', 'Jane']
Arr.groupBy(users, 'age')               // { 30: [...], 25: [...] }
Arr.sortBy(users, 'age', 'desc')        // Sorted by age descending
```

---

## Complete Example

```javascript
const { Env, Url, Hash, Str, Arr } = require('@core/helpers')

// Environment
const port = Env.getInt('APP_PORT', 3000)
const isDev = Env.isDevelopment()

// URL Generation
const profileUrl = Url.to('users/profile')
const logoUrl = Url.asset('images/logo.png')

// Hashing
const password = await Hash.make('secret123')
const isValid = await Hash.check('secret123', password)

// String Manipulation
const slug = Str.slug('My Blog Post Title')
const truncated = Str.truncate('Long description...', 50)

// Array Operations
const users = [{ name: 'John' }, { name: 'Jane' }]
const names = Arr.pluck(users, 'name')
const unique = Arr.unique([1, 2, 2, 3, 3])
```
