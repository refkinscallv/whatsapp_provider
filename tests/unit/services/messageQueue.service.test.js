'use strict'

const messageQueueService = require('../../../app/services/messageQueue.service')
const assert = require('assert')

describe('MessageQueueService - Recurrence Calculation', () => {
    const baseDate = new Date('2026-02-07T10:00:00')

    it('should calculate next hourly recurrence correctly', () => {
        const next = messageQueueService.calculateNextRecurrence(baseDate, 'hourly')
        assert.strictEqual(next.getHours(), 11)
        assert.strictEqual(next.getDate(), 7)
    })

    it('should calculate next daily recurrence correctly', () => {
        const next = messageQueueService.calculateNextRecurrence(baseDate, 'daily')
        assert.strictEqual(next.getDate(), 8)
        assert.strictEqual(next.getHours(), 10)
    })

    it('should calculate next weekly recurrence correctly', () => {
        const next = messageQueueService.calculateNextRecurrence(baseDate, 'weekly')
        assert.strictEqual(next.getDate(), 14)
    })

    it('should calculate next monthly recurrence correctly', () => {
        const next = messageQueueService.calculateNextRecurrence(baseDate, 'monthly')
        assert.strictEqual(next.getMonth(), 2) // March (0-indexed, Feb is 1)
    })

    it('should calculate next yearly recurrence correctly', () => {
        const next = messageQueueService.calculateNextRecurrence(baseDate, 'yearly')
        assert.strictEqual(next.getFullYear(), 2027)
    })
})
