/**
 * Fluxer Reaction Roles Example
 *
 * Users react to a message to get or remove roles. Run !roles to post the message
 * (or set REACTION_ROLES_MESSAGE_ID and REACTION_ROLES_CHANNEL_ID to use an existing message).
 *
 * Usage:
 *   FLUXER_BOT_TOKEN=your_token node examples/reaction-roles-bot.js
 *
 * Configure ROLE_EMOJI_MAP with your guild's role IDs.
 */

import { Client, Events, EmbedBuilder } from '@fluxerjs/core';

// Map emoji (unicode or "name:id") to role ID. Update these for your server.
const ROLE_EMOJI_MAP = {
  '🎮': process.env.ROLE_GAMING ?? 'ROLE_ID_FOR_GAMING',
  '🎵': process.env.ROLE_MUSIC ?? 'ROLE_ID_FOR_MUSIC',
  '📢': process.env.ROLE_ANNOUNCEMENTS ?? 'ROLE_ID_FOR_ANNOUNCEMENTS',
};

const PREFIX = '!';

const client = new Client({ intents: 0 });
let rolesMessageId = process.env.REACTION_ROLES_MESSAGE_ID ?? null;
const _rolesChannelId = process.env.REACTION_ROLES_CHANNEL_ID ?? null;

function getRoleIdForEmoji(reaction) {
  const key = reaction.emoji.id
    ? `${reaction.emoji.name}:${reaction.emoji.id}`
    : reaction.emoji.name;
  return ROLE_EMOJI_MAP[key] ?? ROLE_EMOJI_MAP[reaction.emoji.name];
}

async function handleReactionAdd(reaction, user) {
  if (!reaction.guildId || reaction.messageId !== rolesMessageId) return;

  const roleId = getRoleIdForEmoji(reaction);
  if (!roleId || roleId.startsWith('ROLE_ID_')) return;

  const guild = client.guilds.get(reaction.guildId);
  const member = await guild?.fetchMember(user.id);
  if (!member) return;

  if (member.roles.includes(roleId)) return;

  try {
    await member.addRole(roleId);
    console.log(`[reaction-roles] Added role ${roleId} to user ${user.id}`);
  } catch (err) {
    console.error('[reaction-roles] Failed to add role:', err.message);
  }
}

async function handleReactionRemove(reaction, user) {
  if (!reaction.guildId || reaction.messageId !== rolesMessageId) return;

  const roleId = getRoleIdForEmoji(reaction);
  if (!roleId || roleId.startsWith('ROLE_ID_')) return;

  const guild = client.guilds.get(reaction.guildId);
  const member = await guild?.fetchMember(user.id);
  if (!member) return;

  if (!member.roles.includes(roleId)) return;

  try {
    await member.removeRole(roleId);
    console.log(`[reaction-roles] Removed role ${roleId} from user ${user.id}`);
  } catch (err) {
    console.error('[reaction-roles] Failed to remove role:', err.message);
  }
}

client.on(Events.Ready, () => {
  console.log(`Logged in as ${client.user?.username}`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.content?.startsWith(PREFIX)) return;
  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const cmd = args[0]?.toLowerCase();

  if (cmd === 'roles') {
    if (!message.guildId) {
      await message.reply('Use this in a server channel.');
      return;
    }
    const emojiList = Object.entries(ROLE_EMOJI_MAP)
      .map(
        ([emoji, id]) => `${emoji} ${id.startsWith('ROLE_ID_') ? '(configure ROLE_EMOJI_MAP)' : ''}`
      )
      .join('\n');
    const embed = new EmbedBuilder()
      .setTitle('Reaction Roles')
      .setDescription(
        'React to get a role. Remove your reaction to remove the role.\n\n' + emojiList
      )
      .setColor(0x5865f2)
      .setTimestamp();
    const reply = await message.reply({ embeds: [embed.toJSON()] });
    for (const emoji of Object.keys(ROLE_EMOJI_MAP)) {
      await reply
        .react(emoji)
        .catch((e) => console.warn('Could not add reaction', emoji, e.message));
    }
    rolesMessageId = reply.id;
    console.log(
      `[reaction-roles] Set roles message to ${reply.id}. Set REACTION_ROLES_MESSAGE_ID=${reply.id} and REACTION_ROLES_CHANNEL_ID=${message.channelId} to reuse.`
    );
  }
});

client.on(Events.MessageReactionAdd, handleReactionAdd);
client.on(Events.MessageReactionRemove, handleReactionRemove);
client.on(Events.Error, (err) => console.error('Client error:', err));

const token = process.env.FLUXER_BOT_TOKEN;
if (!token) {
  console.error('Error: Set FLUXER_BOT_TOKEN');
  process.exit(1);
}

client.login(token).catch((err) => {
  console.error('Login failed:', err);
  process.exit(1);
});
