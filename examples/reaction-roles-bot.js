/**
 * Reaction roles — react to get a role; remove the reaction to drop it.
 *
 * Run `!roles` to post the picker (or set REACTION_ROLES_MESSAGE_ID).
 *
 * Usage:
 *   FLUXER_BOT_TOKEN=your_token node examples/reaction-roles-bot.js
 *
 * Configure ROLE_* env vars (or edit ROLE_EMOJI_MAP) with your guild's role IDs.
 *
 * @see https://fluxer.js.org/guides/reactions/
 */

import { Client, EmbedBuilder, Events, parsePrefixCommand } from '@fluxerjs/core';

const ROLE_EMOJI_MAP = {
  '🎮': process.env.ROLE_GAMING ?? 'ROLE_ID_FOR_GAMING',
  '🎵': process.env.ROLE_MUSIC ?? 'ROLE_ID_FOR_MUSIC',
  '📢': process.env.ROLE_ANNOUNCEMENTS ?? 'ROLE_ID_FOR_ANNOUNCEMENTS',
};

const PREFIX = '!';
const client = new Client();
let rolesMessageId = process.env.REACTION_ROLES_MESSAGE_ID ?? null;

function getRoleIdForEmoji(reaction) {
  const key = reaction.emoji.id
    ? `${reaction.emoji.name}:${reaction.emoji.id}`
    : reaction.emoji.name;
  return ROLE_EMOJI_MAP[key] ?? ROLE_EMOJI_MAP[reaction.emoji.name];
}

async function handleReactionAdd({ reaction, user }) {
  if (!reaction.guildId || reaction.messageId !== rolesMessageId) return;
  if (user.bot) return;

  const roleId = getRoleIdForEmoji(reaction);
  if (!roleId || roleId.startsWith('ROLE_ID_')) return;

  const guild = client.guilds.get(reaction.guildId);
  if (!guild) return;

  const member = guild.members.get(user.id) ?? (await guild.fetchMember(user.id).catch(() => null));
  if (!member || member.roles.has(roleId)) return;

  try {
    await member.roles.add(roleId);
    console.log(`[reaction-roles] Added role ${roleId} to user ${user.id}`);
  } catch (err) {
    console.error('[reaction-roles] Failed to add role:', err.message);
  }
}

async function handleReactionRemove({ reaction, user }) {
  if (!reaction.guildId || reaction.messageId !== rolesMessageId) return;
  if (user.bot) return;

  const roleId = getRoleIdForEmoji(reaction);
  if (!roleId || roleId.startsWith('ROLE_ID_')) return;

  const guild = client.guilds.get(reaction.guildId);
  if (!guild) return;

  const member = guild.members.get(user.id) ?? (await guild.fetchMember(user.id).catch(() => null));
  if (!member?.roles.has(roleId)) return;

  try {
    await member.roles.remove(roleId);
    console.log(`[reaction-roles] Removed role ${roleId} from user ${user.id}`);
  } catch (err) {
    console.error('[reaction-roles] Failed to remove role:', err.message);
  }
}

client.on(Events.Ready, () => {
  console.log(`Logged in as ${client.user?.username}`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.content) return;
  const parsed = parsePrefixCommand(message.content, PREFIX);
  if (parsed?.command !== 'roles') return;

  if (!message.guildId) {
    await message.reply('Use this in a server channel.');
    return;
  }

  const emojiList = Object.entries(ROLE_EMOJI_MAP)
    .map(
      ([emoji, id]) => `${emoji} ${id.startsWith('ROLE_ID_') ? '(configure ROLE_EMOJI_MAP)' : ''}`,
    )
    .join('\n');

  const embed = new EmbedBuilder()
    .setTitle('Reaction Roles')
    .setDescription(`React to get a role. Remove your reaction to remove the role.\n\n${emojiList}`)
    .setColor(0x5865f2)
    .setTimestamp();

  const reply = await message.reply({ embeds: [embed] });
  for (const emoji of Object.keys(ROLE_EMOJI_MAP)) {
    await reply.react(emoji).catch((e) => console.warn('Could not add reaction', emoji, e.message));
  }
  rolesMessageId = reply.id;
  console.log(
    `[reaction-roles] Set roles message to ${reply.id}. Persist with REACTION_ROLES_MESSAGE_ID=${reply.id} REACTION_ROLES_CHANNEL_ID=${message.channelId}`,
  );
});

client.on(Events.MessageReactionAdd, handleReactionAdd);
client.on(Events.MessageReactionRemove, handleReactionRemove);
client.on(Events.Error, (err) => console.error('Client error:', err));

const token = process.env.FLUXER_BOT_TOKEN;
if (!token) {
  console.error('Error: Set FLUXER_BOT_TOKEN');
  process.exit(1);
}

try {
  await client.login(token);
} catch (err) {
  console.error('Login failed:', err);
  process.exit(1);
}
