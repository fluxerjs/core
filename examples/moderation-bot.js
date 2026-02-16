/**
 * Fluxer Moderation Example
 *
 * Prefix commands for ban, kick, and unban. Requires Ban Members / Kick Members permissions.
 * Server owner automatically has all permissions (no role needed).
 *
 * Commands:
 *   !ban @user [reason]      - Ban a user (optional: delete messages from last 24h)
 *   !kick @user [reason]     - Kick a user
 *   !unban @user            - Remove a ban
 *   !perms                  - List your guild-level permissions (owner sees all)
 *
 * Usage:
 *   FLUXER_BOT_TOKEN=your_token node examples/moderation-bot.js
 *
 * @see https://fluxerjs.blstmo.com/v/latest/guides/permissions-moderation
 */

import {
  Client,
  Events,
  EmbedBuilder,
  FluxerError,
  ErrorCodes,
  PermissionFlags,
} from '@fluxerjs/core';

const PREFIX = '!';

/** Get the member who sent the message and their guild-level permissions. */
async function getModeratorPerms(message) {
  let guild = message.guild;
  if (!guild && message.guildId) {
    guild = await message.client.guilds.fetch(message.guildId);
  }
  if (!guild) return null;
  let member = guild.members.get(message.author.id);
  if (!member) {
    try {
      member = await guild.fetchMember(message.author.id);
    } catch {
      return null;
    }
  }
  return member.permissions;
}

/** Extract user ID from mention (<@123> or <@!123>) or raw snowflake. */
function parseUserId(arg) {
  if (!arg?.trim()) return null;
  const mentionMatch = arg.trim().match(/^<@!?(\d{17,19})>$/);
  if (mentionMatch) return mentionMatch[1];
  if (/^\d{17,19}$/.test(arg.trim())) return arg.trim();
  return null;
}

const client = new Client({ intents: 0 });

client.on(Events.Ready, () => {
  console.log(
    `Logged in as ${client.user?.username}. Moderation commands: !ban, !kick, !unban, !perms`,
  );
});

/** Return array of permission names the user has. */
function getPermissionNames(perms) {
  return Object.keys(PermissionFlags).filter((name) => perms.has(PermissionFlags[name]));
}

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.content?.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const command = args[0]?.toLowerCase();
  const targetArg = args[1];
  const reason = args.slice(2).join(' ') || null;

  let guild = message.guild;
  if (!guild && message.guildId) {
    guild = await message.client.guilds.fetch(message.guildId);
  }
  if (!guild) {
    await message.reply('Moderation commands only work in a server.');
    return;
  }

  const userId = parseUserId(targetArg);
  const perms = await getModeratorPerms(message);
  if (!perms) {
    await message.reply(
      'Could not load your member data. The bot may need access to view server members.',
    );
    return;
  }

  const canBan = perms.has(PermissionFlags.BanMembers) || perms.has(PermissionFlags.Administrator);
  const canKick =
    perms.has(PermissionFlags.KickMembers) || perms.has(PermissionFlags.Administrator);

  if (command === 'perms') {
    const names = getPermissionNames(perms);
    await message.reply(
      names.length > 0
        ? `**Your server permissions:**\n\`\`\`\n${names.join(', ')}\n\`\`\``
        : 'You have no server permissions.',
    );
    return;
  }

  if (command === 'ban') {
    if (!canBan) {
      await message.reply('You need the Ban Members permission to use this command.');
      return;
    }
    if (!userId) {
      await message.reply('Usage: `!ban @user [reason]`');
      return;
    }
    try {
      await guild.ban(userId, {
        reason: reason ?? undefined,
        delete_message_days: 1,
      });
      const targetUser = message.mentions.find((u) => u.id === userId) ?? { username: 'Unknown' };
      const embed = new EmbedBuilder()
        .setTitle('User Banned')
        .setColor(0xe74c3c)
        .addFields(
          { name: 'User', value: `<@${userId}> (${targetUser.username})`, inline: true },
          { name: 'Moderator', value: `${message.author.username}`, inline: true },
        )
        .setTimestamp();
      if (reason) embed.addFields({ name: 'Reason', value: reason });
      await message.reply({ embeds: [embed.toJSON()] });
    } catch (err) {
      const code = err instanceof FluxerError ? err.code : null;
      const status = err?.statusCode ?? err?.cause?.statusCode;
      const msg =
        code === ErrorCodes.MemberNotFound || status === 404
          ? 'User not found or not in this server.'
          : (err?.message ?? 'Failed to ban user.');
      await message.reply(`Error: ${msg}`);
    }
    return;
  }

  if (command === 'kick') {
    if (!canKick) {
      await message.reply('You need the Kick Members permission to use this command.');
      return;
    }
    if (!userId) {
      await message.reply('Usage: `!kick @user [reason]`');
      return;
    }
    try {
      await guild.kick(userId);
      const targetUser = message.mentions.find((u) => u.id === userId) ?? { username: 'Unknown' };
      const embed = new EmbedBuilder()
        .setTitle('User Kicked')
        .setColor(0xf39c12)
        .addFields(
          { name: 'User', value: `<@${userId}> (${targetUser.username})`, inline: true },
          { name: 'Moderator', value: `${message.author.username}`, inline: true },
        )
        .setTimestamp();
      if (reason) embed.addFields({ name: 'Reason', value: reason });
      await message.reply({ embeds: [embed.toJSON()] });
    } catch (err) {
      const code = err instanceof FluxerError ? err.code : null;
      const status = err?.statusCode ?? err?.cause?.statusCode;
      const msg =
        code === ErrorCodes.MemberNotFound || status === 404
          ? 'User not found or not in this server.'
          : (err?.message ?? 'Failed to kick user.');
      await message.reply(`Error: ${msg}`);
    }
    return;
  }

  if (command === 'unban') {
    if (!canBan) {
      await message.reply('You need the Ban Members permission to use this command.');
      return;
    }
    if (!userId) {
      await message.reply('Usage: `!unban @user`');
      return;
    }
    try {
      await guild.unban(userId);
      await message.reply(`Unbanned <@${userId}>.`);
    } catch (err) {
      const status = err?.statusCode ?? err?.cause?.statusCode;
      const msg =
        status === 404 ? 'User is not banned.' : (err?.message ?? 'Failed to unban user.');
      await message.reply(`Error: ${msg}`);
    }
    return;
  }
});

client.on(Events.Error, (err) => console.error('[fluxer]', err));

client.login(process.env.FLUXER_BOT_TOKEN).catch((err) => {
  console.error('Login failed:', err);
  process.exit(1);
});
