/**
 * Fluxer Reaction Detection Example
 *
 * Listens for when users react to messages. Demonstrates MESSAGE_REACTION_ADD
 * and related gateway events. See packages/types/src/gateway/events.ts for all
 * gateway event names (e.g. MESSAGE_REACTION_ADD, MESSAGE_REACTION_REMOVE).
 *
 * Usage (from repo root after npm install && npm run build):
 *   FLUXER_BOT_TOKEN=your_token node examples/reaction-bot.js
 */

import { Client, Events } from '@fluxerjs/core';

const client = new Client();

client.on(Events.Ready, () => {
  console.log(`Logged in as ${client.user?.username}`);
});

// When someone adds a reaction to any message
client.on(Events.MessageReactionAdd, (data) => {
  const { message_id, channel_id, user_id, emoji } = data;
  const emojiStr = emoji.id ? `<:${emoji.name}:${emoji.id}>` : emoji.name;
  console.log(
    `Reaction added: user ${user_id} reacted with ${emojiStr} on message ${message_id} in channel ${channel_id}`
  );
});

// Tip: filter by message_id or emoji for polls, confirmations, etc.:
//   if (data.message_id !== myPollMessageId) return;
//   if (data.emoji.name !== '👍') return;

// When someone removes their reaction
client.on(Events.MessageReactionRemove, (data) => {
  const { message_id, user_id, emoji } = data;
  const emojiStr = emoji.id ? `<:${emoji.name}:${emoji.id}>` : emoji.name;
  console.log(`Reaction removed: user ${user_id} removed ${emojiStr} from message ${message_id}`);
});

// When all reactions are removed from a message (moderator action)
client.on(Events.MessageReactionRemoveAll, (data) => {
  console.log(
    `All reactions cleared from message ${data.message_id} in channel ${data.channel_id}`
  );
});

// When all reactions of a specific emoji are removed
client.on(Events.MessageReactionRemoveEmoji, (data) => {
  const emojiStr = data.emoji.id ? `<:${data.emoji.name}:${data.emoji.id}>` : data.emoji.name;
  console.log(`All ${emojiStr} reactions removed from message ${data.message_id}`);
});

client.on(Events.Error, (err) => console.error('Client error:', err));

const token = process.env.FLUXER_BOT_TOKEN;
if (!token) {
  console.error('Error: Set FLUXER_BOT_TOKEN environment variable');
  process.exit(1);
}

client
  .login(token)
  .then(() => {
    console.log('Listening for reactions...');
  })
  .catch((err) => {
    console.error('Login failed:', err);
    process.exit(1);
  });
