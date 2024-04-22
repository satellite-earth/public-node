#!bin/env node
import express from 'express';
import { createServer } from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import { SimplePool, useWebSocketImplementation } from 'nostr-tools';
import type HolesailServer from 'holesail-server';
import path from 'path';

import { SQLiteEventStore, NostrRelay, terminateConnectionsInterval } from '@satellite-earth/core';
import { logger } from './logger.js';
import db from './db.js';
import { ENABLE_HYPER_DHT, PORT, PUBLIC_URL, SECRET_KEY } from './env.js';
import { ChannelManager } from './modules/channel-manager.js';
import Signer from './modules/signer.js';
import { AdminCommands } from './modules/admin-command.js';
import { CommunityConfig } from './modules/community-config.js';
import { DeletionManager } from './modules/deletion-manager.js';

// @ts-expect-error
global.WebSocket = WebSocket;
useWebSocketImplementation(WebSocket);

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
const communityDir = path.dirname(import.meta.resolve('@satellite-earth/community-ui').replace('file://', ''));
app.use(express.static(communityDir));

// outbound relay pool
const relayPool = new SimplePool();

// community metadata
const communityConfig = new CommunityConfig(eventStore, signer, relayPool);

// deletion manager
const deletionManager = new DeletionManager(eventStore, signer);

// channel manager
const channelManager = new ChannelManager(eventStore, signer, deletionManager);
channelManager.setup();

// ensure the general channel is created
if (!channelManager.getChannel('general')) {
	channelManager.createChannel('general', { name: 'General', about: 'The main text channel' });
}

const commands = new AdminCommands(eventStore, channelManager);
commands.setup();

let holesail: HolesailServer;
server.listen(PORT, async () => {
	logger('Started server on port', PORT);

	const addresses: string[][] = [];

	if (PUBLIC_URL) addresses.push(['r', PUBLIC_URL]);

	if (ENABLE_HYPER_DHT) {
		const { default: HolesailServer } = await import('holesail-server');

		holesail = new HolesailServer();
		await holesail.serve(PORT, '127.0.0.1', undefined, SECRET_KEY);

		const hyperAddress = holesail.getPublicKey();
		addresses.push(['r', hyperAddress, 'hyper']);

		logger('Started server on', hyperAddress);
	}

	await communityConfig.publish(['wss://nostrue.com'], addresses);

	logger('Published community definition event for', signer.getPublicKey());
});

async function shutdown() {
	relay.stop();
	wss.close();
	server.close();
	if (holesail) holesail.destroy();
	process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
