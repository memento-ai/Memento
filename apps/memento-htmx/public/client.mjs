// Path: apps/memento-htmx/public/client.mjs

import { marked } from 'https://cdn.jsdelivr.net/npm/marked@11.2.0/lib/marked.esm.js'

const conversation = document.getElementById('conversation')
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

function appendMessage(role, content) {
    console.log(`Appending message: ${role}: ${content}`)
    const messageDiv = document.createElement('div')
    messageDiv.classList.add('message', role)
    // Use marked to parse markdown
    messageDiv.innerHTML = `<strong>${role.charAt(0).toUpperCase() + role.slice(1)}:</strong> ${marked.parse(content)}`
    conversation.appendChild(messageDiv)
    conversation.scrollTop = conversation.scrollHeight
}

function adjustTextareaHeight() {
    userInput.style.height = 'auto'
    userInput.style.height = Math.min(userInput.scrollHeight, 150) + 'px'
}

userInput.addEventListener('input', adjustTextareaHeight)

sendButton.addEventListener('click', () => {
    const message = userInput.value.trim()
    if (message) {
        appendMessage('user', message)
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'message', content: message }))
        } else {
            console.error('WebSocket is not open. ReadyState:', ws.readyState)
        }
        userInput.value = ''
        adjustTextareaHeight()
        document.body.dispatchEvent(new Event('contentUpdate'))
    }
})

userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        sendButton.click()
    }
})

let assistantMessage = ''
let assistantMessageElement = null

ws.onmessage = (event) => {
    try {
        const data = JSON.parse(event.data)

        switch (data.type) {
            case 'start':
                // console.log('Starting new assistant message')
                assistantMessage = ''
                assistantMessageElement = document.createElement('div')
                assistantMessageElement.classList.add('message', 'assistant')
                assistantMessageElement.innerHTML = '<strong>Assistant:</strong> '
                conversation.appendChild(assistantMessageElement)
                break

            case 'content':
                assistantMessage += data.content
                if (assistantMessageElement) {
                    // Use marked to parse markdown
                    assistantMessageElement.innerHTML = `<strong>Assistant:</strong> ${marked.parse(assistantMessage)}`
                } else {
                    console.error('Assistant message element not initialized')
                }
                conversation.scrollTop = conversation.scrollHeight
                break

            case 'end':
                // console.log('Ending assistant message')
                assistantMessageElement = null
                break

            default:
                console.error('Unknown message type:', data.type)
        }
    } catch (error) {
        console.error('Error parsing message:', error)
    }
}

// Optional: Initialize textarea height
adjustTextareaHeight()
