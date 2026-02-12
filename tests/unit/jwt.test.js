/**
 * Unit tests for JWT Core Module
 */

const JWT = require('../../core/jwt.core')

describe('JWT Core', () => {
    const testPayload = {
        userId: 123,
        email: 'test@example.com',
        role: 'user',
    }

    describe('Token Generation', () => {
        test('should generate a valid JWT token', () => {
            const token = JWT.sign(testPayload)
            expect(token).toBeDefined()
            expect(typeof token).toBe('string')
            expect(token.split('.')).toHaveLength(3)
        })

        test('should generate token with custom expiration', () => {
            const token = JWT.sign(testPayload, '1h')
            expect(token).toBeDefined()
            expect(typeof token).toBe('string')
        })

        test('should generate different tokens for same payload', async () => {
            const token1 = JWT.sign(testPayload)
            // Wait 1 second to ensure different timestamp
            await new Promise((resolve) => setTimeout(resolve, 1000))
            const token2 = JWT.sign(testPayload)
            expect(token1).not.toBe(token2)
        })

        test('should handle empty payload', () => {
            expect(() => {
                JWT.sign({})
            }).not.toThrow()
        })
    })

    describe('Token Verification', () => {
        test('should verify valid token', () => {
            const token = JWT.sign(testPayload)
            const decoded = JWT.verify(token)

            expect(decoded).toBeDefined()
            expect(decoded).not.toBeNull()
            expect(decoded.userId).toBe(testPayload.userId)
            expect(decoded.email).toBe(testPayload.email)
            expect(decoded.role).toBe(testPayload.role)
        })

        test('should return null for invalid token', () => {
            const decoded = JWT.verify('invalid.token.here')
            expect(decoded).toBeNull()
        })

        test('should return null for malformed token', () => {
            const decoded = JWT.verify('not-a-token')
            expect(decoded).toBeNull()
        })

        test('should return null for empty token', () => {
            const decoded = JWT.verify('')
            expect(decoded).toBeNull()
        })

        test('should verify token with exp claim', () => {
            const token = JWT.sign(testPayload, '1h')
            const decoded = JWT.verify(token)

            expect(decoded).toBeDefined()
            expect(decoded.exp).toBeDefined()
            expect(decoded.iat).toBeDefined()
        })
    })

    describe('Token Decoding', () => {
        test('should decode valid token without verification', () => {
            const token = JWT.sign(testPayload)
            const decoded = JWT.decode(token)

            expect(decoded).toBeDefined()
            expect(decoded.userId).toBe(testPayload.userId)
        })

        test('should return null for invalid token', () => {
            const decoded = JWT.decode('invalid.token')
            expect(decoded).toBeNull()
        })

        test('should decode without checking signature', () => {
            const token = JWT.sign(testPayload)
            // Tamper with the token
            const parts = token.split('.')
            const tamperedToken = parts[0] + '.' + parts[1] + '.tampered'

            const decoded = JWT.decode(tamperedToken)
            expect(decoded).toBeDefined()
        })
    })

    describe('Token Payload', () => {
        test('should preserve all payload data', () => {
            const complexPayload = {
                userId: 456,
                username: 'testuser',
                roles: ['admin', 'user'],
                metadata: {
                    lastLogin: new Date().toISOString(),
                    loginCount: 5,
                },
            }

            const token = JWT.sign(complexPayload)
            const decoded = JWT.verify(token)

            expect(decoded.userId).toBe(complexPayload.userId)
            expect(decoded.username).toBe(complexPayload.username)
            expect(decoded.roles).toEqual(complexPayload.roles)
            expect(decoded.metadata).toEqual(complexPayload.metadata)
        })

        test('should handle numeric payload', () => {
            const token = JWT.sign({ id: 999 })
            const decoded = JWT.verify(token)
            expect(decoded.id).toBe(999)
        })

        test('should handle string payload', () => {
            const token = JWT.sign({ message: 'Hello World' })
            const decoded = JWT.verify(token)
            expect(decoded.message).toBe('Hello World')
        })

        test('should handle boolean payload', () => {
            const token = JWT.sign({ isActive: true })
            const decoded = JWT.verify(token)
            expect(decoded.isActive).toBe(true)
        })
    })

    describe('Token Expiration', () => {
        test('should respect expiration time', () => {
            const token = JWT.sign(testPayload, '1s')
            const decoded = JWT.verify(token)
            expect(decoded).not.toBeNull()
        })

        test('should include exp claim', () => {
            const token = JWT.sign(testPayload)
            const decoded = JWT.decode(token)
            expect(decoded.exp).toBeDefined()
            expect(typeof decoded.exp).toBe('number')
        })

        test('should include iat claim', () => {
            const token = JWT.sign(testPayload)
            const decoded = JWT.decode(token)
            expect(decoded.iat).toBeDefined()
            expect(typeof decoded.iat).toBe('number')
        })
    })

    describe('Error Handling', () => {
        test('should handle null payload gracefully', () => {
            expect(() => {
                JWT.sign(null)
            }).toThrow()
        })

        test('should handle undefined payload gracefully', () => {
            expect(() => {
                JWT.sign(undefined)
            }).toThrow()
        })

        test('should handle null token in verify', () => {
            const decoded = JWT.verify(null)
            expect(decoded).toBeNull()
        })

        test('should handle undefined token in verify', () => {
            const decoded = JWT.verify(undefined)
            expect(decoded).toBeNull()
        })
    })
})
