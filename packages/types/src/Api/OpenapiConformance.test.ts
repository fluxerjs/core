import { describe, expect, it } from 'vitest';
import { ChannelType } from './Channel.js';
import type { RESTPostAPIEmbed } from './Embed.js';
import {
  AuditLogActionType,
  ContentWarningLevel,
  GuildNSFWLevel,
  SplashCardAlignment,
} from './Guild.js';
import { InviteType } from './Invite.js';
import { MessageFlags, MessageReferenceType, MessageType } from './Message.js';

describe('ChannelType OpenAPI alignment', () => {
  it('GuildLink is canonical 998', () => {
    expect(ChannelType.GuildLink).toBe(998);
  });
});

describe('wire discriminator enums', () => {
  it('MessageReferenceType matches OpenAPI', () => {
    expect(MessageReferenceType.Default).toBe(0);
    expect(MessageReferenceType.Forward).toBe(1);
  });

  it('InviteType matches OpenAPI', () => {
    expect(InviteType.Guild).toBe(0);
    expect(InviteType.GroupDM).toBe(1);
    expect(Object.keys(InviteType).filter((k) => Number.isNaN(Number(k)))).toEqual([
      'Guild',
      'GroupDM',
    ]);
  });

  it('GuildNSFWLevel / ContentWarningLevel / SplashCardAlignment match OpenAPI', () => {
    expect(GuildNSFWLevel.Safe).toBe(0);
    expect(GuildNSFWLevel.AgeRestricted).toBe(3);
    expect(ContentWarningLevel.Inherit).toBe(0);
    expect(ContentWarningLevel.ContentWarning).toBe(1);
    expect(SplashCardAlignment.Center).toBe(0);
    expect(SplashCardAlignment.Right).toBe(2);
  });

  it('MessageFlags is a bitfield map; MessageType / AuditLogActionType are enums', () => {
    expect(MessageFlags.SuppressEmbeds).toBe(4);
    expect(MessageFlags.SuppressNotifications).toBe(4096);
    expect(MessageFlags.VoiceMessage).toBe(8192);
    expect('CompactAttachments' in MessageFlags).toBe(false);
    expect(MessageType.Reply).toBe(19);
    expect(AuditLogActionType.MessageDelete).toBe(72);
  });
});

describe('generated openapi-conformance', () => {
  it('RESTPostAPIEmbed keys are a subset of RICH_EMBED_REQUEST_KEYS when generated', async () => {
    let RICH_EMBED_REQUEST_KEYS: readonly string[] | undefined;
    try {
      ({ RICH_EMBED_REQUEST_KEYS } = await import('../_generated/openapi-conformance.js'));
    } catch {
      // Generated file missing until openapi:generate runs
      return;
    }

    const requestKeys = [
      'url',
      'title',
      'color',
      'timestamp',
      'description',
      'author',
      'image',
      'thumbnail',
      'footer',
      'fields',
    ] as const satisfies readonly (keyof RESTPostAPIEmbed)[];

    const allowed = new Set<string>(RICH_EMBED_REQUEST_KEYS);
    for (const key of requestKeys) {
      expect(allowed.has(key)).toBe(true);
    }
  });

  it('GUILD_LINK_CHANNEL_TYPE matches ChannelType.GuildLink when generated', async () => {
    let GUILD_LINK_CHANNEL_TYPE: number | undefined;
    try {
      ({ GUILD_LINK_CHANNEL_TYPE } = await import('../_generated/openapi-conformance.js'));
    } catch {
      return;
    }

    expect(ChannelType.GuildLink).toBe(GUILD_LINK_CHANNEL_TYPE);
  });
});
