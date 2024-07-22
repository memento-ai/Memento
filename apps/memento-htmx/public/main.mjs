// Path: apps/memento-htmx/public/main.mjs

import { marked } from 'https://cdn.jsdelivr.net/npm/marked@11.2.0/lib/marked.esm.js'
import { sendMessage, setupWebSocket } from './websocket.mjs'

const conversationScroll = document.getElementById('conversation-scroll')
const userInput = document.getElementById('user-input')
const sendButton = document.getElementById('send-button')

// Custom renderer for code blocks
const renderer = new marked.Renderer()
renderer.code = (code, language) => {
    // Escape special characters in the code
    const escapedCode = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
        .replace(/`/g, '&#96;')
    return `<pre><code class="language-${language}">${escapedCode}</code></pre>`
}

// Configure marked to use the custom renderer
marked.use({
    renderer,
    pedantic: false,
    gfm: true,
    breaks: true,
})

let activeExchange = null
let accumulatedResponse = ''
let accumulatedEscapedResponse = ''

function escapeForPre(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function createNewExchange(userMessage) {
    const exchangeDiv = document.createElement('div')
    exchangeDiv.classList.add('exchange')

    const userMessageDiv = document.createElement('div')
    userMessageDiv.classList.add('message', 'user')
    userMessageDiv.innerHTML = `<strong>User:</strong> ${marked.parse(userMessage)}`
    exchangeDiv.appendChild(userMessageDiv)

    const assistantMessageDiv = document.createElement('div')
    assistantMessageDiv.classList.add('message', 'assistant')
    assistantMessageDiv.innerHTML = '<strong>Assistant:</strong> <pre></pre>'
    exchangeDiv.appendChild(assistantMessageDiv)

    conversationScroll.appendChild(exchangeDiv)
    activeExchange = exchangeDiv
    scrollToBottom()
}

function updateActiveExchange(chunk) {
    if (activeExchange) {
        accumulatedResponse += chunk
        accumulatedEscapedResponse += escapeForPre(chunk)
        const assistantMessage = activeExchange.querySelector('.message.assistant')
        assistantMessage.innerHTML = `<strong>Assistant:</strong> <pre>${accumulatedEscapedResponse}</pre>`
        scrollToBottom()
    }
}

function finalizeExchange() {
    a
    if (activeExchange) {
        const assistantMessage = activeExchange.querySelector('.message.assistant')
        // Use marked.parse with the custom renderer
        assistantMessage.innerHTML = marked.parse(`**Assistant:** ${accumulatedResponse}`)
        activeExchange.classList.add('historical-exchange')
        accumulatedResponse = '' // Reset for the next exchange
        accumulatedEscapedResponse = '' // Reset the escaped version as well
        activeExchange = null
    }
}

function scrollToBottom() {
    conversationScroll.scrollTop = conversationScroll.scrollHeight
}

function adjustTextareaHeight() {
    userInput.style.height = 'auto'
    userInput.style.height = Math.min(userInput.scrollHeight, 150) + 'px'
}

function onMessage(event) {
    try {
        const data = JSON.parse(event.data)

        switch (data.type) {
            case 'start':
                // No need to create a new exchange here, as it's created when the user sends a message
                document.body.dispatchEvent(new Event('contentUpdate'))
                break

            case 'content':
                updateActiveExchange(data.content)
                break

            case 'end':
                finalizeExchange()
                break

            default:
                console.error('Unknown message type:', data.type)
        }
    } catch (error) {
        console.error('Error parsing message:', error)
    }
}

async function fetchRecentExchanges() {
    try {
        const response = await fetch('/api/recent-synopses')
        const exchanges = await response.json()
        exchanges.forEach((exchange) => {
            const exchangeElement = createExchangeElement(exchange)
            conversationScroll.appendChild(exchangeElement)
        })
        scrollToBottom()
    } catch (error) {
        console.error('Error fetching recent exchanges:', error)
    }
}

function createExchangeElement(synopsis) {
    const exchangeDiv = document.createElement('div')
    exchangeDiv.classList.add('exchange', 'historical-exchange')
    exchangeDiv.setAttribute('data-docid', synopsis.docid)
    exchangeDiv.innerHTML = `
        <div class="synopsis-content">${escapeForPre(synopsis.content)}</div>
        <div class="full-exchange"></div>
    `
    exchangeDiv.addEventListener('click', () => toggleExchange(exchangeDiv))
    return exchangeDiv
}

async function toggleExchange(element) {
    const docid = element.getAttribute('data-docid')
    const fullExchange = element.querySelector('.full-exchange')

    if (element.classList.toggle('expanded')) {
        try {
            const response = await fetch(`/api/memento/${docid}`)
            const exchange = await response.json()
            const { userMessage, assistantMessage } = parseExchange(exchange.content)

            fullExchange.innerHTML = `
                <div class="message user">
                    <strong>User:</strong> ${marked.parse(userMessage)}
                </div>
                <div class="message assistant">
                    <strong>Assistant:</strong> ${marked.parse(assistantMessage)}
                </div>
            `
        } catch (error) {
            console.error('Error fetching full exchange:', error)
            fullExchange.innerHTML = 'Error loading full exchange'
        }
    } else {
        fullExchange.innerHTML = ''
    }
}

function parseExchange(content) {
    const re = /# User:\n(.+)\n\n---\n\n# Assistant:\n(.+)\n/ms
    const m = content.match(re)
    if (!m) {
        throw new Error(`parseExchangeAsMessagePair failed to parse content: ${content}`)
    }
    const userMessage = m[1].trim() + '\n'
    const assistantMessage = m[2].trim() + '\n'
    return { userMessage, assistantMessage }
}

function init() {
    setupWebSocket(onMessage)

    userInput.addEventListener('input', adjustTextareaHeight)

    sendButton.addEventListener('click', () => {
        const message = userInput.value.trim()
        if (message) {
            createNewExchange(message)
            sendMessage({ type: 'message', content: message })
            userInput.value = ''
            adjustTextareaHeight()
        }
    })

    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendButton.click()
        }
    })

    // Call fetchRecentExchanges when the page loads
    document.addEventListener('DOMContentLoaded', fetchRecentExchanges)

    // Initialize textarea height
    adjustTextareaHeight()
}

init()
