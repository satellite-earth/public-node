import { NostrEvent } from 'nostr-tools';
import { IEventStore } from '../../../core/dist/index.js';
import { ChannelManager } from './channel-manager.js';
import { getTagValue } from '../helpers/event.js';
import { logger } from '../logger.js';

export const EDIT_METADATA_KIND = 9002;
export const SET_CHANNEL_STATUS_KIND = 9006;

export class AdminCommands {
	log = logger.extend('admin-commands');
	eventStore: IEventStore;
	channelManager: ChannelManager;

	constructor(eventStore: IEventStore, channelManager: ChannelManager) {
		this.eventStore = eventStore;
		this.channelManager = channelManager;
	}

	setup() {
		this.eventStore.on('event:inserted', this.handleEvent.bind(this));
	}

	handleEvent(event: NostrEvent) {
		switch (event.kind) {
			case EDIT_METADATA_KIND:
				this.setChannelMetadata(event);
				break;
			case SET_CHANNEL_STATUS_KIND:
				if (event.tags.some((t) => t[0] === 'purge')) this.purgeChannel(event);
				else this.setChannelStatus(event);
				break;

			default:
				break;
		}
	}

	protected setChannelMetadata(event: NostrEvent) {
		const id = getTagValue(event, 'h');
		if (!id) return;

		const name = getTagValue(event, 'name');
		const about = getTagValue(event, 'about');
		const picture = getTagValue(event, 'picture');

		const channel = this.channelManager.getChannel(id);
		if (channel) {
			// only update the channel if the command is newer
			if (channel.updated_at < event.created_at) {
				this.log('Updating channel', id);
				this.channelManager.updateChannel(id, { name, about, picture });
			}
		} else {
			this.log('Creating channel', id);
			this.channelManager.createChannel(id, { name, about, picture });
		}
	}

	protected purgeChannel(event: NostrEvent) {
		const id = getTagValue(event, 'h');
		if (!id) return;

		const channel = this.channelManager.getChannel(id);
		if (channel && channel.updated_at < event.created_at) {
			this.log('Purging channel', id);
			this.channelManager.purgeChannel(id);
		}
	}

	protected setChannelStatus(event: NostrEvent) {
		const id = getTagValue(event, 'h');
		if (!id) return;

		const channel = this.channelManager.getChannel(id);
		if (channel && channel.updated_at < event.created_at) {
			const isPublic = event.tags.some((t) => t[0] === 'public');
			const isOpen = event.tags.some((t) => t[0] === 'open');

			this.log('Changing channel status', isPublic, isOpen);

			channel.public = isPublic;
			channel.open = isOpen;

			this.channelManager.saveChannel(id);
		}
	}
}
