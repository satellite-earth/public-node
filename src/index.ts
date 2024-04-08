#!bin/env node
import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import WebSocket, { WebSocketServer } from 'ws';

import { SQLiteEventStore, NostrRelay, terminateConnectionsInterval } from '../../core/dist/index.js';
import { ENABLE_HYPER_DHT, PORT, PUBLIC_URL, SECRET_KEY } from './env.js';
import { logger } from './logger.js';
import db from './db.js';
import { ChannelManager } from './modules/channel-manager.js';
import Signer from './modules/signer.js';
import { AdminCommands } from './modules/admin-command.js';
import dayjs from 'dayjs';
import { Relay, useWebSocketImplementation } from 'nostr-tools';

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

	const addresses: string[][] = [];

	if (PUBLIC_URL) addresses.push(['r', PUBLIC_URL]);

	if (ENABLE_HYPER_DHT) {
		const { default: HolesailServer } = await import('holesail-server');

		const holesail = new HolesailServer();
		await holesail.serve(PORT, '127.0.0.1', undefined, SECRET_KEY);

		const hyperAddress = holesail.getPublicKey();
		addresses.push(['r', hyperAddress, 'hyper']);

		logger('Started server on', hyperAddress);
	}

	const communityEvent = await signer.signEvent({
		kind: 12012,
		content: '',
		tags: [
			['name', 'Temp Community Name'],
			['about', 'Community Description'],
			['image', 'https://cdn.hzrd149.com/a0e2b39975c8da1702374b3eed6f4c6c7333e6ae0008dadafe93bd34bfb2ca78.png'],
			...addresses,
		],
		created_at: dayjs().unix(),
	});

	eventStore.addEvent(communityEvent);

	const relay = await Relay.connect('wss://nostrue.com');
	relay.publish(communityEvent);
	logger('Published community definition event for', communityEvent.pubkey);
});
