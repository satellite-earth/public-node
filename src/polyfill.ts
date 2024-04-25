import WebSocket from 'ws';
import { useWebSocketImplementation } from 'nostr-tools';

// @ts-expect-error
global.WebSocket = WebSocket;
useWebSocketImplementation(WebSocket);
