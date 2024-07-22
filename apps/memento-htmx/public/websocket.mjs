let socket;
let reconnectInterval = 1000; // Start with 1 second interval
const maxReconnectInterval = 30000; // Maximum reconnect interval of 30 seconds

export function setupWebSocket(onMessage) {
    const connect = () => {
        socket = new WebSocket(`ws://${window.location.host}/ws`);

        socket.onopen = () => {
            console.log('WebSocket connection established');
            reconnectInterval = 1000; // Reset reconnect interval on successful connection
        };

        socket.onmessage = onMessage;

        socket.onclose = () => {
            console.log('WebSocket connection closed. Reconnecting...');
            setTimeout(connect, reconnectInterval);
            reconnectInterval = Math.min(reconnectInterval * 2, maxReconnectInterval);
        };

        socket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    };

    connect();
}

export function sendMessage(message) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
    } else {
        console.error('WebSocket is not open. Message not sent.');
    }
}