'use strict'

const cron = require('node-cron')
const Logger = require('@core/logger.core')
const messageQueueService = require('@app/services/messageQueue.service')

/**
 * Cron Jobs
 * Scheduled tasks for the application
 */
class CronJobs {
    constructor() {
        this.jobs = []
    }

    /**
     * Initialize all cron jobs
     */
    init() {
        Logger.info('Initializing cron jobs...')

        // Message queue processor - runs every 2 minutes
        // The cron job is now a lightweight sweep/dispatcher only.
        // Actual processing with delays happens event-driven via processNextForDevice.
        const queueProcessorSchedule = process.env.CRON_QUEUE_PROCESSOR || '*/2 * * * *'
        const queueProcessor = cron.schedule(queueProcessorSchedule, async () => {
            try {
                await messageQueueService.processQueue()
            } catch (err) {
                Logger.error('Error in queue processor cron job', err)
            }
        })

        this.jobs.push({
            name: 'Queue Processor',
            schedule: queueProcessorSchedule,
            job: queueProcessor,
        })

        // Campaign Scheduler - runs every 2 minutes
        const campaignSchedulerSchedule = '*/2 * * * *'
        const campaignScheduler = cron.schedule(campaignSchedulerSchedule, async () => {
            try {
                const campaignService = require('@app/services/campaign.service')
                await campaignService.processScheduledCampaigns()
            } catch (err) {
                Logger.error('Error in campaign scheduler cron job', err)
            }
        })

        this.jobs.push({
            name: 'Campaign Scheduler',
            schedule: campaignSchedulerSchedule,
            job: campaignScheduler,
        })

        // Individual Message Scheduler - runs every minute
        const messageSchedulerSchedule = '* * * * *'
        const messageScheduler = cron.schedule(messageSchedulerSchedule, async () => {
            try {
                await messageQueueService.processScheduledMessages()
            } catch (err) {
                Logger.error('Error in message scheduler cron job', err)
            }
        })

        this.jobs.push({
            name: 'Message Scheduler',
            schedule: messageSchedulerSchedule,
            job: messageScheduler,
        })

        // Subscription Monitor - runs every day at midnight
        const subscriptionMonitorSchedule = '0 0 * * *'
        const subscriptionMonitor = cron.schedule(subscriptionMonitorSchedule, async () => {
            try {
                const subscriptionService = require('@app/services/subscription.service')
                await subscriptionService.checkExpirations()
                await subscriptionService.processQuotaResets()
            } catch (err) {
                Logger.error('Error in subscription monitor cron job', err)
            }
        })

        this.jobs.push({
            name: 'Subscription Monitor',
            schedule: subscriptionMonitorSchedule,
            job: subscriptionMonitor,
        })

        // Contact Sync - runs every hour
        const contactSyncSchedule = '0 * * * *'
        const contactSync = cron.schedule(contactSyncSchedule, async () => {
            try {
                const contactService = require('@app/services/contact.service')
                await contactService.backgroundSync()
            } catch (err) {
                Logger.error('Error in contact sync cron job', err)
            }
        })

        this.jobs.push({
            name: 'Contact Sync',
            schedule: contactSyncSchedule,
            job: contactSync,
        })

        // Log Cleanup - runs every Sunday at 02:00
        const logCleanupSchedule = '0 2 * * 0'
        const logCleanup = cron.schedule(logCleanupSchedule, async () => {
            try {
                Logger.info('Running log cleanup...')
                // Implementation for log rotation/cleanup if needed
                // Currently handled by winston-daily-rotate-file but good to have a hook
            } catch (err) {
                Logger.error('Error in log cleanup cron job', err)
            }
        })

        this.jobs.push({
            name: 'Log Cleanup',
            schedule: logCleanupSchedule,
            job: logCleanup,
        })

        Logger.info(`Started ${this.jobs.length} cron jobs`)

        // Database Cleanup - runs daily at 03:00 to prevent table bloat
        const dbCleanupSchedule = '0 3 * * *'
        const dbCleanup = cron.schedule(dbCleanupSchedule, async () => {
            try {
                const retentionDays = parseInt(process.env.QUEUE_RETENTION_DAYS) || 7
                Logger.info(`Running DB cleanup (retention: ${retentionDays} days)...`)
                await messageQueueService.cleanupOldRecords(retentionDays)
            } catch (err) {
                Logger.error('Error in DB cleanup cron job', err)
            }
        })

        this.jobs.push({
            name: 'DB Cleanup',
            schedule: dbCleanupSchedule,
            job: dbCleanup,
        })

        Logger.info(`Started ${this.jobs.length} cron jobs`)
    }

    /**
     * Stop all cron jobs
     */
    stopAll() {
        Logger.info('Stopping all cron jobs...')

        this.jobs.forEach((job) => {
            job.job.stop()
            Logger.info(`Stopped cron job: ${job.name}`)
        })

        this.jobs = []
    }

    /**
     * Get all cron jobs info
     */
    getJobs() {
        return this.jobs.map((job) => ({
            name: job.name,
            schedule: job.schedule,
        }))
    }
}

module.exports = new CronJobs()
