// Path: apps/memento-htmx/public/client.mjs

import { marked } from 'https://cdn.jsdelivr.net/npm/marked@11.2.0/lib/marked.esm.js'

const conversationScroll = document.getElementById('conversation-scroll')
const userInput = document.getElementById('user-input')
const sendButton = document.getElementById('send-button')

const ws = new WebSocket(`ws://${window.location.host}/ws`)

ws.onopen = () => {
    console.log('WebSocket connection established')
}

ws.onerror = (error) => {
    console.error('WebSocket error:', error)
}

ws.onclose = () => {
    console.log('WebSocket connection closed')
}

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
marked.use({ renderer })

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
    if (activeExchange) {
        const assistantMessage = activeExchange.querySelector('.message.assistant')
        // Use marked.parse with the custom renderer
        assistantMessage.innerHTML = marked.parse(`**Assistant:** ${accumulatedResponse}`, { renderer })
        activeExchange.classList.add('historical-synopsis')
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

userInput.addEventListener('input', adjustTextareaHeight)

sendButton.addEventListener('click', () => {
    const message = userInput.value.trim()
    if (message) {
        createNewExchange(message)
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'message', content: message }))
        } else {
            console.error('WebSocket is not open. ReadyState:', ws.readyState)
        }
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

ws.onmessage = (event) => {
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

async function fetchRecentSynopses() {
    try {
        const response = await fetch('/api/recent-synopses')
        const synopses = await response.json()
        synopses.forEach((synopsis) => {
            const synopsisElement = createSynopsisElement(synopsis)
            conversationScroll.appendChild(synopsisElement)
        })
        scrollToBottom()
    } catch (error) {
        console.error('Error fetching recent synopses:', error)
    }
}

function createSynopsisElement(synopsis) {
    const synopsisDiv = document.createElement('div')
    synopsisDiv.classList.add('exchange', 'historical-synopsis')
    synopsisDiv.setAttribute('data-docid', synopsis.docid)
    synopsisDiv.innerHTML = `
        <div class="synopsis-content">${escapeForPre(synopsis.content)}</div>
        <div class="full-exchange"></div>
    `
    synopsisDiv.addEventListener('click', () => toggleSynopsis(synopsisDiv))
    return synopsisDiv
}

async function toggleSynopsis(element) {
    const docid = element.getAttribute('data-docid')
    const fullExchange = element.querySelector('.full-exchange')

    if (element.classList.toggle('expanded')) {
        try {
            const response = await fetch(`/api/memento/${docid}`)
            const exchange = await response.json()
            fullExchange.innerHTML = marked.parse(exchange.content, { renderer })
        } catch (error) {
            console.error('Error fetching full exchange:', error)
            fullExchange.innerHTML = 'Error loading full exchange'
        }
    } else {
        fullExchange.innerHTML = ''
    }
}

// Call fetchRecentSynopses when the page loads
document.addEventListener('DOMContentLoaded', fetchRecentSynopses)

// Initialize textarea height
adjustTextareaHeight()
