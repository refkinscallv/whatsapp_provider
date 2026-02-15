'use strict'

const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
const path = require('path')
const fs = require('fs')
const config = require('@app/config')
const Logger = require('@core/logger.core')

// Use stealth plugin
puppeteer.use(StealthPlugin())

/**
 * AI Provider Configuration
 */
const AI_PROVIDERS = {
    chatgpt: {
        url: 'https://chatgpt.com',
        selectorInput: 'div.ProseMirror#prompt-textarea[contenteditable="true"]',
        selectorOutput: 'article[data-testid^="conversation-turn-"]:last-child div.markdown',
        stableDuration: 3000
    },
    gemini: {
        url: 'https://gemini.google.com',
        selectorInput: 'div.ql-editor.textarea[contenteditable="true"]',
        selectorOutput: 'message-content:last-of-type div.markdown',
        stableDuration: 3000
    }
}

/**
 * Browser Pool Management
 * Maintains persistent browser instances per device
 */
class BrowserPool {
    constructor() {
        this.browsers = new Map() // deviceId -> browser instance
        this.pages = new Map()    // deviceId_aiModel -> page instance
        this.lastActivity = new Map() // deviceId -> timestamp
        this.launchingBrowsers = new Map() // deviceId -> launch promise
    }

    /**
     * Get or create browser instance for device
     * @param {string} deviceId - Device identifier
     * @returns {Promise<Browser>}
     */
    async getBrowser(deviceId) {
        // If browser is already running
        if (this.browsers.has(deviceId)) {
            this.lastActivity.set(deviceId, Date.now())
            return this.browsers.get(deviceId)
        }

        // Check if browser is currently being launched (concurrency lock)
        if (this.launchingBrowsers.has(deviceId)) {
            return this.launchingBrowsers.get(deviceId)
        }

        const launchPromise = (async () => {
            try {
                const sessionDir = path.join(config.ai.sessionPath, `device_${deviceId}`)

                // Ensure session directory exists
                if (!fs.existsSync(sessionDir)) {
                    fs.mkdirSync(sessionDir, { recursive: true })
                }

                Logger.info(`[AI] Launching browser for device ${deviceId}`)

                const browser = await puppeteer.launch({
                    headless: config.ai.headless,
                    devtools: !config.ai.headless,
                    defaultViewport: null,
                    executablePath: config.ai.chromeExecutable || undefined,
                    userDataDir: sessionDir,
                    args: [
                        '--start-maximized',
                        '--disable-web-security',
                        '--disable-features=IsolateOrigins,site-per-process',
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-blink-features=AutomationControlled'
                    ]
                })

                this.browsers.set(deviceId, browser)
                this.lastActivity.set(deviceId, Date.now())

                return browser
            } finally {
                this.launchingBrowsers.delete(deviceId)
            }
        })()

        this.launchingBrowsers.set(deviceId, launchPromise)
        return launchPromise
    }

    /**
     * Get or create page for device, AI model, and specific chat
     * @param {string} deviceId - Device identifier
     * @param {string} aiModel - AI model (chatgpt/gemini)
     * @param {string} chatId - WhatsApp Chat ID
     * @returns {Promise<Page>}
     */
    async getPage(deviceId, aiModel, chatId) {
        const browser = await this.getBrowser(deviceId)
        // Isolate by chat_id to keep memory per user
        const key = `${deviceId}_${aiModel}_${chatId}`

        if (this.pages.has(key)) {
            const page = this.pages.get(key)
            // Check if page is still alive
            if (!page.isClosed()) {
                return page
            }
            this.pages.delete(key)
        }

        const page = await browser.newPage()
        await page.setUserAgent(config.ai.userAgent)

        // Additional stealth measures
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', {
                get: () => false
            })
        })

        this.pages.set(key, page)
        return page
    }

    /**
     * Close browser for specific device
     * @param {string} deviceId - Device identifier
     * @returns {Promise<void>}
     */
    async closeBrowser(deviceId) {
        if (this.browsers.has(deviceId)) {
            const browser = this.browsers.get(deviceId)
            await browser.close()
            this.browsers.delete(deviceId)
            this.lastActivity.delete(deviceId)

            // Clean up related pages
            for (const [key] of this.pages) {
                if (key.startsWith(`${deviceId}_`)) {
                    this.pages.delete(key)
                }
            }

            Logger.info(`[AI] Browser closed for device ${deviceId}`)
        }
    }

    /**
     * Cleanup inactive browsers
     * @returns {Promise<number>} - Number of browsers closed
     */
    async cleanupInactive() {
        const now = Date.now()
        const timeout = config.ai.sessionTimeout
        let closed = 0

        for (const [deviceId, lastActive] of this.lastActivity) {
            if (now - lastActive > timeout) {
                await this.closeBrowser(deviceId)
                closed++
            }
        }

        if (closed > 0) {
            Logger.info(`[AI] Cleaned up ${closed} inactive browser sessions`)
        }

        return closed
    }
}

/**
 * AI Automation Service
 * Handles Puppeteer automation for ChatGPT and Gemini
 */
class AiAutomationService {
    constructor() {
        this.browserPool = new BrowserPool()

        // Cleanup inactive sessions every 15 minutes
        setInterval(() => {
            this.browserPool.cleanupInactive()
        }, 15 * 60 * 1000)
    }

    /**
     * Delay helper
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise<void>}
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms))
    }

    /**
     * Wait for stable text (AI finished typing)
     * @param {Page} page - Puppeteer page
     * @param {string} selector - CSS selector
     * @param {number} stableDuration - How long text should be stable (ms)
     * @param {number} checkInterval - Interval between checks (ms)
     * @param {number} timeout - Max wait time (ms)
     * @returns {Promise<string>}
     */
    async waitForStableText(page, selector, stableDuration = 3000, checkInterval = 1000, timeout = 90000) {
        const startTime = Date.now()
        let lastText = ''
        let stableTime = Date.now()

        while (Date.now() - startTime < timeout) {
            const currentText = await page.evaluate((sel) => {
                const els = Array.from(document.querySelectorAll(sel))
                const lastEl = els.pop()
                return lastEl ? lastEl.innerText.trim() : ''
            }, selector)

            if (currentText && currentText !== lastText) {
                lastText = currentText
                stableTime = Date.now()
            } else if (currentText && Date.now() - stableTime >= stableDuration) {
                return currentText // Stable text
            }

            await this.delay(checkInterval)
        }

        throw new Error(`Text did not stabilize within ${timeout}ms`)
    }

    /**
     * Emit status update via Socket.IO
     * @param {string} deviceId - Device identifier
     * @param {string} status - Status (loading/success/error)
     * @param {string} message - Status message
     */
    emitStatus(deviceId, status, message) {
        try {
            const Socket = require('@core/socket.core')
            const io = Socket.getInstance()
            if (io) {
                io.to(`device_${deviceId}`).emit('aiStatus', {
                    status,
                    message,
                    timestamp: Date.now()
                })
            }
        } catch (err) {
            // Socket not available, ignore
        }

        Logger.info(`[AI:Device${deviceId}] ${message}`)
    }

    /**
     * Handle common popups and banners
     * @param {Page} page - Puppeteer page
     */
    async handlePopups(page) {
        try {
            await page.evaluate(() => {
                const selectors = [
                    'button:contains("Accept all")',
                    'button:contains("Accept")',
                    'button:contains("Dismiss")',
                    'button:contains("Stay logged in")',
                    'button:contains("Got it")',
                    'button:contains("Skip")'
                ]

                const buttons = Array.from(document.querySelectorAll('button, div[role="button"]'))
                for (const btn of buttons) {
                    const text = btn.innerText.toLowerCase()
                    if (
                        text.includes('accept all') ||
                        text.includes('accept cookies') ||
                        text.includes('dismiss') ||
                        text.includes('got it') ||
                        text.includes('stay logged in')
                    ) {
                        btn.click()
                    }
                }

                // Also try to close any overlay with an X or close button
                const closeBtn = document.querySelector('button[aria-label="Close"], .close-button')
                if (closeBtn) closeBtn.click()
            })
            await this.delay(1000)
        } catch (err) {
            // Ignore popup errors
        }
    }

    /**
     * Check for Cloudflare challenge and wait if necessary
     * @param {Page} page - Puppeteer page
     * @param {string} deviceId - Device identifier
     * @returns {Promise<void>}
     */
    async checkCloudflare(page, deviceId) {
        const isCloudflare = await page.evaluate(() => {
            const body = document.body.innerText
            return body.includes('Verify you are human') ||
                body.includes('Checking if the site connection is secure') ||
                document.querySelector('#cloudflare-challenge') !== null ||
                document.querySelector('iframe[src*="cloudflare"]') !== null
        })

        if (isCloudflare) {
            this.emitStatus(deviceId, 'cloudflare_detected', 'Cloudflare challenge detected! Please solve it in the browser window.')
            Logger.warn(`[AI:Device${deviceId}] Cloudflare challenge detected. Waiting for manual resolution...`)

            // Wait for cloudflare to disappear or timeout
            try {
                await page.waitForFunction(() => {
                    const body = document.body.innerText
                    return !body.includes('Verify you are human') &&
                        !body.includes('Checking if the site connection is secure') &&
                        document.querySelector('#cloudflare-challenge') === null
                }, { timeout: 120000, polling: 2000 })

                this.emitStatus(deviceId, 'loading', 'Cloudflare resolved, continuing...')
            } catch (err) {
                throw new Error('Cloudflare challenge not resolved within 2 minutes.')
            }
        }
    }

    /**
     * Query AI (ChatGPT or Gemini)
     * @param {string} deviceId - Device identifier
     * @param {string} aiModel - AI model (chatgpt/gemini)
     * @param {string} chatId - WhatsApp Chat ID
     * @param {string} fullPrompt - Full prompt with knowledge injected
     * @returns {Promise<string>}
     */
    async queryAI(deviceId, aiModel, chatId, fullPrompt) {
        const provider = AI_PROVIDERS[aiModel.toLowerCase()]
        if (!provider) {
            throw new Error(`Unknown AI provider: ${aiModel}`)
        }

        this.emitStatus(deviceId, 'loading', `Connecting to ${aiModel}...`)

        try {
            const page = await this.browserPool.getPage(deviceId, aiModel, chatId)

            // Relaxed navigation: Only goto home if we are not already on the provider's domain
            // This allows persistent conversations/threads to stay active
            const currentUrl = page.url()
            const providerDomain = provider.url.replace('https://', '').split('/')[0]

            if (!currentUrl.includes(providerDomain)) {
                this.emitStatus(deviceId, 'loading', `Navigating to ${provider.url}...`)
                await page.goto(provider.url, {
                    waitUntil: 'domcontentloaded',
                    timeout: 90000
                })

                // Give extra time for lazy-loaded content
                await this.delay(3000)
            }

            // Check for Cloudflare detection
            await this.checkCloudflare(page, deviceId)

            // Handle potential popups (Cookie banners, etc.)
            await this.handlePopups(page)

            // Wait for input field with extended timeout and retries
            this.emitStatus(deviceId, 'loading', 'Waiting for ChatGPT to load...')

            let inputElement = null
            let retries = 0
            const maxRetries = 3

            // Try multiple common selectors for ChatGPT/Gemini
            const selectorsToTry = [
                provider.selectorInput,
                '#prompt-textarea',
                'div[contenteditable="true"][role="textbox"]',
                'textarea'
            ]

            while (!inputElement && retries < maxRetries) {
                try {
                    // Try to wait for any of the possible selectors
                    await Promise.race(
                        selectorsToTry.map(sel => page.waitForSelector(sel, { timeout: 30000 }))
                    )

                    // Find which one appeared
                    for (const sel of selectorsToTry) {
                        inputElement = await page.$(sel)
                        if (inputElement) {
                            Logger.info(`[AI:Device${deviceId}] Found input field with selector: ${sel}`)
                            break
                        }
                    }

                    if (!inputElement) {
                        retries++
                        this.emitStatus(deviceId, 'loading', `Retry ${retries}/${maxRetries}: Input field not found...`)
                        await page.reload({ waitUntil: 'domcontentloaded' })
                        await this.delay(5000)
                    }
                } catch (err) {
                    retries++
                    if (retries >= maxRetries) {
                        throw new Error(`ChatGPT input field not found after ${maxRetries} retries. Screenshot shows page stuck or structure changed.`)
                    }
                    this.emitStatus(deviceId, 'loading', `Retry ${retries}/${maxRetries}: Page slow, reloading...`)
                    await page.reload({ waitUntil: 'domcontentloaded' })
                    await this.delay(5000)
                    await this.checkCloudflare(page, deviceId)
                }
            }

            // Type prompt with human-like delays
            await inputElement.click()
            await this.delay(500)
            await inputElement.focus()
            await this.delay(500)

            // Clear existing text
            await page.evaluate((sel) => {
                const el = document.querySelector(sel)
                if (el) {
                    if (el.innerText) el.innerText = ''
                    if (el.value) el.value = ''
                }
            }, provider.selectorInput)

            await this.delay(300)

            // Split prompt by newlines to handle Shift+Enter (prevents premature submission)
            const lines = fullPrompt.split('\n')
            this.emitStatus(deviceId, 'loading', `Typing prompt (${lines.length} lines)...`)

            for (let i = 0; i < lines.length; i++) {
                if (lines[i]) {
                    await page.keyboard.type(lines[i], { delay: 20 })
                }
                if (i < lines.length - 1) {
                    // Use Shift+Enter for newlines within the prompt
                    await page.keyboard.down('Shift')
                    await page.keyboard.press('Enter')
                    await page.keyboard.up('Shift')
                }
            }

            await this.delay(500)
            this.emitStatus(deviceId, 'loading', 'Sending prompt...')
            await page.keyboard.press('Enter')
            await this.delay(2000)

            // Wait for stable response
            this.emitStatus(deviceId, 'loading', 'Waiting for AI response...')
            const response = await this.waitForStableText(
                page,
                provider.selectorOutput,
                provider.stableDuration,
                1000,
                config.ai.timeout
            )

            if (!response) {
                throw new Error('No response received from AI')
            }

            this.emitStatus(deviceId, 'success', 'Response received')
            return response

        } catch (error) {
            this.emitStatus(deviceId, 'error', `Error: ${error.message}`)

            // Fallback screenshot for debugging
            try {
                const page = await this.browserPool.getPage(deviceId, aiModel)
                const screenshotDir = path.join(config.app.log_dir, 'ai-screenshots')
                if (!fs.existsSync(screenshotDir)) {
                    fs.mkdirSync(screenshotDir, { recursive: true })
                }

                const screenshotPath = path.join(screenshotDir, `ai-error-${deviceId}-${Date.now()}.png`)
                await page.screenshot({ path: screenshotPath, fullPage: true })
                Logger.error(`[AI] Screenshot saved: ${screenshotPath}`)
            } catch (screenshotErr) {
                Logger.error('[AI] Failed to save screenshot:', screenshotErr)
            }

            throw error
        }
    }

    /**
     * Close all browser sessions
     * @returns {Promise<void>}
     */
    async shutdown() {
        Logger.info('[AI] Shutting down all browser sessions...')

        for (const [deviceId] of this.browserPool.browsers) {
            await this.browserPool.closeBrowser(deviceId)
        }
    }
}

module.exports = new AiAutomationService()
