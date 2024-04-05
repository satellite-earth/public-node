#!bin/env node
import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import WebSocket, { WebSocketServer } from 'ws';

import { SQLiteEventStore, NostrRelay, terminateConnectionsInterval } from '../../core/dist/index.js';
import { ENABLE_HYPER_DHT, PORT, SECRET_KEY } from './env.js';
import { logger } from './logger.js';
import db from './db.js';
import { ChannelManager } from './modules/channel-manager.js';
import Signer from './modules/signer.js';
import { AdminCommands } from './modules/admin-command.js';

// @ts-expect-error
global.WebSocket = WebSocket;

const signer = new Signer(SECRET_KEY);

const eventStore = new SQLiteEventStore(db);
await eventStore.setup();

const server = createServer();
const wss = new WebSocketServer({ server });

// terminate connections if they become inactive
terminateConnectionsInterval(wss, 30000);

const relay = new NostrRelay(eventStore);
relay.attachToServer(wss);

const app = express();
server.on('request', app);

// serve the community ui
app.use(express.static('../community-ui/dist'));

// channel manager
const channelManager = new ChannelManager(eventStore, signer);
channelManager.setup();

// ensure the general channel is created
if (!channelManager.getChannel('general')) {
	channelManager.createChannel('general', { name: 'General', about: 'The main text channel' });
}

const commands = new AdminCommands(eventStore, channelManager);
commands.setup();

server.listen(PORT, async () => {
	logger('Started server on port', PORT);

	if (ENABLE_HYPER_DHT) {
		const { default: HolesailServer } = await import('holesail-server');

		const holesail = new HolesailServer();
		await holesail.serve(PORT, '127.0.0.1', undefined, SECRET_KEY);

		logger('Started server on', 'hyper://' + holesail.getPublicKey());
	}
});
