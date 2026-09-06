/**
 * Reaction detection example — listen for MESSAGE_REACTION_* gateway events.
 *
 * Usage:
 *   FLUXER_BOT_TOKEN=your_token node examples/reaction-bot.js
 *
 * @see https://fluxer.js.org/guides/reactions/
 */

import { Client, Events } from '@fluxerjs/core';

const client = new Client();

client.on(Events.Ready, () => {
  console.log(`Logged in as ${client.user?.username}`);
});

// MessageReactionAdd / Remove emit a single MessageReactionPayload object.
client.on(
  Events.MessageReactionAdd,
  ({ reaction, emoji, userId, messageId, channelId, message }) => {
    const emojiStr = emoji.id ? `<:${emoji.name}:${emoji.id}>` : emoji.name;
    console.log(
      `Reaction added: user ${userId} reacted with ${emojiStr} on message ${messageId} in channel ${channelId} (guild ${reaction.guildId ?? 'DM'}, cached=${Boolean(message)})`,
    );
  },
);

client.on(Events.MessageReactionRemove, ({ emoji, userId, messageId }) => {
  const emojiStr = emoji.id ? `<:${emoji.name}:${emoji.id}>` : emoji.name;
  console.log(`Reaction removed: user ${userId} removed ${emojiStr} from message ${messageId}`);
});

client.on(Events.MessageReactionRemoveAll, ({ messageId, channelId }) => {
  console.log(`All reactions cleared from message ${messageId} in channel ${channelId}`);
});

client.on(Events.MessageReactionRemoveEmoji, ({ messageId, emoji }) => {
  const emojiStr = emoji.id ? `<:${emoji.name}:${emoji.id}>` : emoji.name;
  console.log(`All ${emojiStr} reactions removed from message ${messageId}`);
});

client.on(Events.Error, (err) => console.error('Client error:', err));

const token = process.env.FLUXER_BOT_TOKEN;
if (!token) {
  console.error('Error: Set FLUXER_BOT_TOKEN environment variable');
  process.exit(1);
}

try {
  await client.login(token);
  console.log('Listening for reactions...');
} catch (err) {
  console.error('Login failed:', err);
  process.exit(1);
}
