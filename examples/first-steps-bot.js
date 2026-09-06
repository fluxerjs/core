/**
 * First Steps Bot: five starter commands to learn the SDK.
 *
 * Commands: !ping, !hello [name], !avatar [@user], !embed, !perms, !noreply, !here
 *
 * Usage (from repo root after pnpm install && pnpm run build):
 *   FLUXER_BOT_TOKEN=your_token node examples/first-steps-bot.js
 *
 * See: https://fluxer.js.org/guides/basic-bot/
 */

import {
  Client,
  EmbedBuilder,
  ErrorCodes,
  Events,
  FluxerError,
  PermissionFlags,
  parsePrefixCommand,
  parseUserMention,
} from '@fluxerjs/core';

const PREFIX = '!';
const client = new Client();

client.on(Events.Ready, () => console.log('Ready!'));

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.content) return;

  const parsed = parsePrefixCommand(message.content, PREFIX);
  if (!parsed) return;

  const { command, args } = parsed;

  try {
    if (command === 'ping') {
      await message.reply('Pong!');
      return;
    }

    if (command === 'noreply') {
      await message.reply({ content: 'Replied without pinging you.', ping: false });
      return;
    }

    if (command === 'hello') {
      const name = args[0] ?? message.author.username;
      await message.reply(`Hello, ${name}!`);
      return;
    }

    if (command === 'avatar') {
      const target = args[0];
      const userId = target ? parseUserMention(target) : message.author.id;
      if (!userId) {
        await message.reply('Mention a user or leave empty for yourself: `!avatar @user`');
        return;
      }
      try {
        const user =
          userId === message.author.id ? message.author : await client.users.fetch(userId);
        const embed = new EmbedBuilder()
          .setTitle(`${user.username}'s avatar`)
          .setImage(user.displayAvatarURL({ size: 256 }))
          .setColor(user.avatarColor ?? 0x5865f2)
          .setTimestamp();
        await message.reply({ embeds: [embed] });
      } catch (err) {
        if (err instanceof FluxerError) {
          await message.reply('Could not find that user.');
          return;
        }
        throw err;
      }
      return;
    }

    if (command === 'embed') {
      const embed = new EmbedBuilder()
        .setTitle('First embed')
        .setDescription('You just sent an embed!')
        .setColor(0x5865f2)
        .addFields(
          { name: 'Field 1', value: 'Value 1', inline: true },
          { name: 'Field 2', value: 'Value 2', inline: true },
        )
        .setFooter({ text: 'Fluxer.js' })
        .setTimestamp();
      await message.reply({ embeds: [embed] });
      return;
    }

    if (command === 'here') {
      const channel = await message.resolveChannel();
      await channel.send(`This channel is ${channel}`);
      return;
    }

    if (command === 'perms') {
      if (!message.guildId) {
        await message.reply('Use this command in a server.');
        return;
      }
      const guild = await message.resolveGuild();
      if (!guild) {
        await message.reply('Could not find this server.');
        return;
      }
      const member = message.member ?? (await guild.members.resolve(message.author.id));
      const has = (flag) => member.permissions.has(flag);
      const permNames = [];
      if (has(PermissionFlags.BanMembers)) permNames.push('BanMembers');
      if (has(PermissionFlags.KickMembers)) permNames.push('KickMembers');
      if (has(PermissionFlags.Administrator)) permNames.push('Administrator');
      if (has(PermissionFlags.ManageRoles)) permNames.push('ManageRoles');
      const embed = new EmbedBuilder()
        .setTitle('Your permissions')
        .setDescription(permNames.length ? permNames.join(', ') : '*(none of the common flags)*')
        .setColor(0x57f287)
        .setTimestamp();
      await message.reply({ embeds: [embed] });
    }
  } catch (err) {
    const code = err instanceof FluxerError ? err.code : null;
    console.error('Command error:', code ?? err);
    if (code === ErrorCodes.InvalidChannelType) {
      await message.reply('That channel type cannot send messages.').catch(() => {});
      return;
    }
    await message.reply('Something went wrong.').catch(() => {});
  }
});

client.on(Events.Error, (err) => console.error('Client error:', err));

await client.login(process.env.FLUXER_BOT_TOKEN);
