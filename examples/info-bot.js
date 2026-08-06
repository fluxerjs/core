/**
 * Info / profile bot — user, server, role, and guild member profile helpers.
 *
 * Commands:
 *   !userinfo [@user|id] — profile (global + server when in a guild)
 *   !serverinfo [guild_id] — this server (or by ID)
 *   !roleinfo <@Role|id|name> — role details
 *   !setnick [nickname] — change the bot's nickname here
 *   !setavatar [url|clear] — change the bot's guild avatar
 *   !bme — dump guild.members.me fields
 *
 * Usage:
 *   FLUXER_BOT_TOKEN=your_token node examples/info-bot.js
 *
 * Optional: SETAVATAR_DEBUG=1
 */

import {
  Client,
  cdnBannerURL,
  cdnMemberAvatarURL,
  EmbedBuilder,
  Events,
  PermissionFlags,
  parsePrefixCommand,
  parseUserMention,
} from '@fluxerjs/core';

const PREFIX = '!';
const BRAND_COLOR = 0x4641d9;
const SETAVATAR_DEBUG =
  process.env.SETAVATAR_DEBUG === '1' || process.env.SETAVATAR_DEBUG === 'true';

const VERIFICATION_LEVELS = ['None', 'Low', 'Medium', 'High', 'Very High'];
const MFA_LEVELS = ['None', 'Elevated'];
const EXPLICIT_CONTENT_FILTERS = ['Disabled', 'Members without roles', 'All members'];
const DEFAULT_NOTIFICATION_LEVELS = ['All messages', 'Only mentions'];

function resolveRoleArg(arg) {
  if (!arg) return null;
  const mention = arg.match(/^<@&(\d+)>$/);
  if (mention) return { type: 'id', value: mention[1] };
  if (/^\d{17,19}$/.test(arg)) return { type: 'id', value: arg };
  return { type: 'name', value: arg };
}

function addProfileFields(fields, profile, profileData, prefix = '') {
  if (!profile || typeof profile !== 'object') return;
  if (profile.pronouns) {
    fields.push({
      name: `${prefix}Pronouns`,
      value: String(profile.pronouns).slice(0, 40),
      inline: true,
    });
  }
  if (profile.bio) {
    fields.push({ name: `${prefix}Bio`, value: String(profile.bio).slice(0, 1024) });
  }
  if (profile.banner) {
    fields.push({ name: `${prefix}Banner`, value: 'Set', inline: true });
  }
  const accent = profile.accentColor ?? profile.bannerColor;
  if (accent != null) {
    fields.push({
      name: `${prefix}Accent`,
      value: `#${Number(accent).toString(16).padStart(6, '0')}`,
      inline: true,
    });
  }
  const mutual = profileData?.mutualGuilds?.length ?? profileData?.mutualGuildIds?.length;
  if (mutual) {
    fields.push({ name: `${prefix}Mutual servers`, value: String(mutual), inline: true });
  }
}

async function requireGuild(message, client) {
  const guildId = message.guildId;
  if (!guildId) {
    await message.reply('Use this command in a server.');
    return null;
  }
  const guild = client.guilds.get(guildId) ?? (await client.guilds.fetch(guildId));
  if (!guild) {
    await message.reply('Could not find this server.');
    return null;
  }
  return guild;
}

const token = process.env.FLUXER_BOT_TOKEN;
if (!token) {
  console.error('Error: Set FLUXER_BOT_TOKEN environment variable');
  process.exit(1);
}

const client = new Client({
  rest: process.env.FLUXER_API_URL ? { api: process.env.FLUXER_API_URL } : undefined,
});

client.on(Events.Ready, () => {
  console.log(`Logged in as ${client.user?.username}`);
  client.user?.setPresence({
    status: 'online',
    customStatus: { text: 'Try !userinfo' },
  });
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.content) return;
  const parsed = parsePrefixCommand(message.content, PREFIX);
  if (!parsed) return;
  const { command, args } = parsed;

  try {
    if (command === 'setnick') {
      const guild = await requireGuild(message, client);
      if (!guild) return;
      const me = guild.members.me ?? (await guild.members.fetchMe());
      const newNick = args.join(' ').trim() || null;
      try {
        await me.edit({ nick: newNick });
        await message.reply(
          newNick
            ? `Nickname set to \`${newNick}\`.`
            : 'Nickname cleared (showing username again).',
        );
      } catch {
        await message
          .reply('Failed to change nickname. The bot may need Change Nickname permission.')
          .catch(() => {});
      }
      return;
    }

    if (command === 'setavatar') {
      const guild = await requireGuild(message, client);
      if (!guild) return;
      const me = guild.members.me ?? (await guild.members.fetchMe());
      const arg = args[0]?.toLowerCase();
      if (arg === 'clear' || arg === 'reset') {
        try {
          await me.edit({ avatar: null });
          await message.reply('Guild avatar cleared.');
        } catch (err) {
          if (SETAVATAR_DEBUG) console.error('[setavatar]', err);
          await message.reply('Failed to clear guild avatar.').catch(() => {});
        }
        return;
      }
      const url = args[0]?.trim();
      if (!url || !/^https?:\/\//i.test(url)) {
        await message.reply(
          'Provide an image URL: `!setavatar https://example.com/image.png` or `!setavatar clear`.',
        );
        return;
      }
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) {
          await message.reply(`Could not fetch image: ${res.status}`);
          return;
        }
        const mime = (res.headers.get('content-type') ?? 'image/png').split(';')[0].trim();
        if (!mime.startsWith('image/')) {
          await message.reply('URL must point to an image (png, jpeg, gif, webp).');
          return;
        }
        const buf = Buffer.from(await res.arrayBuffer());
        const dataUri = `data:${mime};base64,${buf.toString('base64')}`;
        await me.edit({ avatar: dataUri });
        const updated = await guild.fetchMember(me.id);
        if (dataUri && !updated.avatar) {
          await message.reply(
            'Request succeeded but the avatar was not applied. Guild avatars may require premium on Fluxer.',
          );
        } else {
          await message.reply('Guild avatar updated!');
        }
      } catch (err) {
        if (SETAVATAR_DEBUG) console.error('[setavatar]', err);
        if (err?.name === 'AbortError') {
          await message.reply('Timed out fetching image (30s).');
        } else {
          await message.reply('Failed to set guild avatar.').catch(() => {});
        }
      }
      return;
    }

    if (command === 'bme') {
      const guild = await requireGuild(message, client);
      if (!guild) return;
      const me = guild.members.me ?? (await guild.members.fetchMe());
      const roleNames = [...me.roles.roleIds]
        .filter((id) => id !== guild.id)
        .map((id) => guild.roles.get(id)?.name ?? id);
      const permNames = [];
      for (const [name, bit] of Object.entries(PermissionFlags)) {
        if (typeof bit === 'number' && me.permissions.has(bit)) permNames.push(name);
      }
      const embed = new EmbedBuilder()
        .setTitle('guild.members.me')
        .setDescription("Bot's GuildMember in this server")
        .setColor(me.accentColor ?? me.user.avatarColor ?? BRAND_COLOR)
        .setThumbnail(me.displayAvatarURL({ size: 256 }))
        .addFields(
          { name: 'ID', value: `\`${me.id}\``, inline: true },
          { name: 'Username', value: me.user.username ?? '—', inline: true },
          { name: 'Display name', value: me.displayName ?? '—', inline: true },
          { name: 'Nickname', value: me.nick ?? '*(none)*', inline: true },
          { name: 'Joined', value: me.joinedAt?.toISOString() ?? '—', inline: true },
          {
            name: 'Roles',
            value: roleNames.length ? roleNames.slice(0, 15).join(', ') : '*(none)*',
          },
          {
            name: 'Permissions (sample)',
            value: permNames.length ? permNames.slice(0, 12).join(', ') : '*(none)*',
          },
        )
        .setFooter({ text: `Guild: ${guild.name}` })
        .setTimestamp();
      await message.reply({ embeds: [embed] });
      return;
    }

    if (command === 'userinfo') {
      const userId = args[0] ? parseUserMention(args[0]) : message.author.id;
      if (!userId) {
        await message.reply('Provide a mention or user ID. Example: `!userinfo @Someone`');
        return;
      }
      let data;
      try {
        data = await client.users.fetchWithProfile(userId, {
          guildId: message.guildId ?? undefined,
        });
      } catch {
        await message.reply('Could not fetch that user.');
        return;
      }
      const { user, userData, globalProfile, serverProfile, memberData } = data;
      const globalProf = globalProfile?.userProfile;
      const serverProf = serverProfile?.userProfile;
      const bannerHash = serverProf?.banner || globalProf?.banner || userData.banner;
      const bannerUrl = bannerHash ? cdnBannerURL(userData.id, bannerHash, { size: 512 }) : null;
      const accent =
        Number(
          serverProf?.accentColor ??
            serverProf?.bannerColor ??
            globalProf?.accentColor ??
            globalProf?.bannerColor ??
            userData.avatar_color ??
            memberData?.accent_color ??
            BRAND_COLOR,
        ) || BRAND_COLOR;
      const avatarUrl =
        message.guildId && memberData?.avatar
          ? cdnMemberAvatarURL(message.guildId, userData.id, memberData.avatar, { size: 256 })
          : user.displayAvatarURL({ size: 256 });
      const displayName = userData.global_name ?? userData.username ?? 'User';

      const fields = [
        { name: 'Username', value: userData.username ?? '—', inline: true },
        { name: 'Display name', value: displayName, inline: true },
        { name: 'ID', value: `\`${userData.id}\``, inline: true },
        { name: 'Bot', value: userData.bot ? 'Yes' : 'No', inline: true },
      ];
      if (globalProfile) {
        fields.push({ name: '\u200B', value: '**Global profile**', inline: false });
        addProfileFields(fields, globalProf, globalProfile);
      }
      if (message.guildId && (serverProfile || memberData)) {
        fields.push({ name: '\u200B', value: '**Server profile**', inline: false });
        addProfileFields(fields, serverProf, serverProfile, 'Server ');
        if (memberData?.nick) {
          fields.push({
            name: 'Nickname',
            value: String(memberData.nick).slice(0, 32),
            inline: true,
          });
        }
        if (memberData?.joined_at) {
          fields.push({
            name: 'Joined',
            value: `<t:${Math.floor(new Date(memberData.joined_at).getTime() / 1000)}:R>`,
            inline: true,
          });
        }
      }

      const embed = new EmbedBuilder()
        .setTitle(`${displayName}'s profile`)
        .setAuthor({ name: displayName, iconURL: avatarUrl })
        .setColor(accent)
        .addFields(...fields)
        .setFooter({ text: `Requested by ${message.author.username}` })
        .setTimestamp();
      if (bannerUrl) embed.setImage(bannerUrl);
      await message.reply({ embeds: [embed] });
      return;
    }

    if (command === 'serverinfo') {
      const guildId = args[0] ?? message.guildId;
      if (!guildId) {
        await message.reply('Use this in a server or provide a guild ID.');
        return;
      }
      let guild;
      try {
        guild = client.guilds.get(guildId) ?? (await client.guilds.fetch(guildId));
      } catch {
        await message.reply('Could not fetch that server.');
        return;
      }
      if (!guild) {
        await message.reply('Could not fetch that server.');
        return;
      }
      const embed = new EmbedBuilder()
        .setTitle(guild.name ?? 'Server')
        .setColor(BRAND_COLOR)
        .setThumbnail(guild.iconURL?.({ size: 256 }) ?? null)
        .addFields(
          { name: 'ID', value: `\`${guild.id}\``, inline: true },
          { name: 'Owner ID', value: `\`${guild.ownerId ?? '—'}\``, inline: true },
          {
            name: 'Verification',
            value: VERIFICATION_LEVELS[guild.verificationLevel] ?? String(guild.verificationLevel),
            inline: true,
          },
          {
            name: 'MFA',
            value: MFA_LEVELS[guild.mfaLevel] ?? String(guild.mfaLevel),
            inline: true,
          },
          {
            name: 'Explicit filter',
            value:
              EXPLICIT_CONTENT_FILTERS[guild.explicitContentFilter] ??
              String(guild.explicitContentFilter ?? 0),
            inline: true,
          },
          {
            name: 'Default notifications',
            value: DEFAULT_NOTIFICATION_LEVELS[guild.defaultMessageNotifications] ?? '—',
            inline: true,
          },
          {
            name: 'Features',
            value: guild.features?.length ? guild.features.join(', ') : '—',
          },
        )
        .setFooter({ text: `Requested by ${message.author.username}` })
        .setTimestamp();
      await message.reply({ embeds: [embed] });
      return;
    }

    if (command === 'roleinfo') {
      const guild = await requireGuild(message, client);
      if (!guild) return;
      const resolved = resolveRoleArg(args[0]);
      if (!resolved) {
        await message.reply('Provide a role mention, ID, or name. Example: `!roleinfo Moderator`');
        return;
      }
      const roleList = await guild.fetchRoles();
      const role =
        roleList.find((r) =>
          resolved.type === 'id'
            ? r.id === resolved.value
            : r.name?.toLowerCase() === resolved.value.toLowerCase(),
        ) ??
        (resolved.type === 'id' ? guild.roles.get(resolved.value) : null) ??
        null;
      if (!role) {
        await message.reply(
          resolved.type === 'id' ? 'No role found with that ID.' : 'No role found with that name.',
        );
        return;
      }
      const embed = new EmbedBuilder()
        .setTitle(role.name ?? 'Role')
        .setColor(role.color && role.color !== 0 ? role.color : BRAND_COLOR)
        .addFields(
          { name: 'ID', value: `\`${role.id}\``, inline: true },
          { name: 'Position', value: String(role.position ?? 0), inline: true },
          {
            name: 'Color',
            value:
              role.color && role.color !== 0
                ? `#${Number(role.color).toString(16).padStart(6, '0')}`
                : 'Default',
            inline: true,
          },
          { name: 'Hoist', value: role.hoist ? 'Yes' : 'No', inline: true },
          { name: 'Mentionable', value: role.mentionable ? 'Yes' : 'No', inline: true },
          { name: 'Unicode emoji', value: role.unicodeEmoji ?? '—', inline: true },
          { name: 'Permissions', value: String(role.permissions ?? '—').slice(0, 1024) },
        )
        .setFooter({ text: `Requested by ${message.author.username}` })
        .setTimestamp();
      await message.reply({ embeds: [embed] });
    }
  } catch (err) {
    console.error('Command error:', err);
    await message.reply('Something went wrong.').catch(() => {});
  }
});

client.on(Events.Error, (err) => console.error('Client error:', err));

try {
  await client.login(token);
} catch (err) {
  console.error('Login failed:', err);
  process.exit(1);
}
