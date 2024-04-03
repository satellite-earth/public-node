#!bin/env node
import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import WebSocket, { WebSocketServer } from 'ws';

import { SQLiteEventStore } from '../../core/dist/index.js';
import { PORT } from './env.js';
import { logger } from './logger.js';
import db from './db.js';

// @ts-expect-error
global.WebSocket = WebSocket;

const eventStore = new SQLiteEventStore(db);

const server = createServer();

const wss = new WebSocketServer({ server });

// TODO: setup relay

const app = express();
server.on('request', app);

app.use(express.static('../community-ui/dist'));

server.listen(PORT, () => {
	logger('Started server on port', PORT);
});
