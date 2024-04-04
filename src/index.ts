#!bin/env node
import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import WebSocket, { WebSocketServer } from 'ws';

import { SQLiteEventStore, NostrRelay, terminateConnectionsInterval } from '../../core/dist/index.js';
import { PORT } from './env.js';
import { logger } from './logger.js';
import db from './db.js';

// @ts-expect-error
global.WebSocket = WebSocket;

const eventStore = new SQLiteEventStore(db);

const server = createServer();

const wss = new WebSocketServer({ server });

// terminate connections if they become inactive
terminateConnectionsInterval(wss, 30000);

const relay = new NostrRelay(eventStore);
relay.attachToServer(wss);

const app = express();
server.on('request', app);

app.use(express.static('../community-ui/dist'));

server.listen(PORT, () => {
	logger('Started server on port', PORT);
});
