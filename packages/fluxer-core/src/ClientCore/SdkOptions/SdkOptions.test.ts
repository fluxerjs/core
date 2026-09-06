import { GuildNSFWLevel } from '@fluxerjs/types';
import { PermissionFlags } from '@fluxerjs/util';
import { describe, expect, it } from 'vitest';
import {
  toAttachmentUploadCompleteBody,
  toAttachmentUploadPlanBody,
  toAttachmentUploadPlanResponse,
  toMessageAttachmentEditWire,
} from './Attachments.js';
import {
  toChannelCreateBody,
  toChannelEditBody,
  toChannelInviteBody,
  toGroupDmEditBody,
} from './Channels.js';
import {
  toDiscoveryApplicationPayload,
  toDiscoveryBody,
  toDiscoveryStatusPayload,
} from './Discovery.js';
import {
  toEmojiCreateBody,
  toEmojiEditBody,
  toStickerCreateBody,
  toStickerEditBody,
} from './Expressions.js';
import {
  toChannelPositionBody,
  toGuildBanBody,
  toGuildEditBody,
  toRoleCreateBody,
  toRoleEditBody,
} from './Guild.js';
import { toMemberEditBody, toMemberSearchBody } from './Members.js';
import { toBulkFetchWire, toMessageSearchBody, toMessageSearchResponse } from './Messages.js';
import { toPresenceWire } from './Presence.js';
import { toProfilePayload } from './Profile.js';
import { toSudoBody } from './Sudo.js';

describe('SdkOptions serializers', () => {
  describe('Attachments', () => {
    it('toMessageAttachmentEditWire maps camelCase fields and omits unset', () => {
      expect(
        toMessageAttachmentEditWire([
          { id: 1, filename: 'a.png', uploadFilename: 'up', fileSize: 10 },
          { id: '2', description: null },
        ]),
      ).toEqual([
        {
          id: 1,
          filename: 'a.png',
          upload_filename: 'up',
          file_size: 10,
        },
        { id: '2', description: null },
      ]);
    });

    it('toAttachmentUploadPlanBody / CompleteBody map wire keys', () => {
      expect(
        toAttachmentUploadPlanBody([
          { id: 0, filename: 'x.bin', fileSize: 9, contentType: 'application/octet-stream' },
        ]),
      ).toEqual({
        attachments: [
          {
            id: 0,
            filename: 'x.bin',
            file_size: 9,
            content_type: 'application/octet-stream',
          },
        ],
      });
      expect(toAttachmentUploadCompleteBody([{ uploadFilename: 'u', uploadId: 'id1' }])).toEqual({
        uploads: [{ upload_filename: 'u', upload_id: 'id1' }],
      });
    });

    it('toAttachmentUploadPlanResponse maps singlepart and multipart', () => {
      const mapped = toAttachmentUploadPlanResponse({
        attachments: [
          {
            id: 1,
            filename: 'a.png',
            upload_filename: 'a',
            file_size: 1,
            content_type: 'image/png',
            upload_mode: 'singlepart',
            upload_url: 'https://up',
          },
          {
            id: 2,
            filename: 'b.bin',
            upload_filename: 'b',
            file_size: 2,
            content_type: 'application/octet-stream',
            upload_mode: 'multipart',
            upload_id: 'uid',
            part_size: 5,
            parts: [{ part_number: 1, upload_url: 'https://p1' }],
          },
        ],
      });
      expect(mapped.attachments[0]).toMatchObject({
        uploadMode: 'singlepart',
        uploadUrl: 'https://up',
        uploadFilename: 'a',
      });
      expect(mapped.attachments[1]).toMatchObject({
        uploadMode: 'multipart',
        uploadId: 'uid',
        partSize: 5,
        parts: [{ partNumber: 1, uploadUrl: 'https://p1' }],
      });
    });
  });

  describe('Channels', () => {
    it('toChannelEditBody maps parentId / rateLimit / overwrites', () => {
      expect(toChannelEditBody({})).toEqual({});
      expect(
        toChannelEditBody({
          name: 'general',
          parentId: 'p1',
          url: 'https://example.com',
          rateLimitPerUser: 5,
          rtcRegion: null,
          permissionOverwrites: [{ id: 'r1', type: 0, allow: '8', deny: '0' }],
        }),
      ).toEqual({
        name: 'general',
        parent_id: 'p1',
        url: 'https://example.com',
        rate_limit_per_user: 5,
        rtc_region: null,
        permission_overwrites: [{ id: 'r1', type: 0, allow: '8', deny: '0' }],
      });
    });

    it('toChannelEditBody resolves PermissionResolvable overwrites', () => {
      expect(
        toChannelEditBody({
          permissionOverwrites: [
            { id: 'r1', type: 0, allow: 'Administrator', deny: ['SendMessages'] },
          ],
        }),
      ).toEqual({
        permission_overwrites: [{ id: 'r1', type: 0, allow: '8', deny: '2048' }],
      });
    });

    it('toChannelInviteBody maps maxUses / maxAge', () => {
      expect(toChannelInviteBody({ maxUses: 1, maxAge: 3600, unique: true })).toEqual({
        max_uses: 1,
        max_age: 3600,
        unique: true,
      });
    });

    it('toChannelCreateBody maps parentId / rateLimitPerUser', () => {
      expect(
        toChannelCreateBody({
          name: 'general',
          type: 0,
          parentId: 'p1',
          rateLimitPerUser: 5,
          nsfw: false,
        }),
      ).toEqual({
        name: 'general',
        type: 0,
        parent_id: 'p1',
        rate_limit_per_user: 5,
        nsfw: false,
      });
    });

    it('toGroupDmEditBody always sends type 3', () => {
      expect(toGroupDmEditBody({ name: 'room' })).toEqual({ type: 3, name: 'room' });
    });
  });

  describe('Discovery', () => {
    it('toDiscoveryBody maps category / tags / language', () => {
      expect(
        toDiscoveryBody({
          description: 'hi',
          primaryCategoryId: '3',
          keywords: ['bots'],
          primaryLanguage: 'en',
        }),
      ).toEqual({
        description: 'hi',
        category_type: 3,
        custom_tags: ['bots'],
        primary_language: 'en',
      });
    });

    it('toDiscoveryStatusPayload nests application camelCase', () => {
      expect(
        toDiscoveryStatusPayload({
          eligible: true,
          min_member_count: 50,
          application: {
            guild_id: 'g1',
            status: 'pending',
            description: 'd',
            category_type: 1,
            custom_tags: ['a'],
          },
        }),
      ).toEqual({
        eligible: true,
        minMemberCount: 50,
        application: {
          guildId: 'g1',
          status: 'pending',
          description: 'd',
          categoryType: 1,
          customTags: ['a'],
        },
      });
      expect(
        toDiscoveryApplicationPayload({
          guild_id: 'g1',
          status: 'approved',
          description: 'x',
          category_type: 2,
        }),
      ).toMatchObject({ guildId: 'g1', categoryType: 2 });
    });
  });

  describe('Expressions', () => {
    it('emoji/sticker bodies map file→image and omit unset', () => {
      expect(toEmojiCreateBody({ name: 'wave', image: 'data:' })).toEqual({
        name: 'wave',
        image: 'data:',
      });
      expect(toEmojiEditBody({ name: 'wave2' })).toEqual({ name: 'wave2' });
      expect(toStickerCreateBody({ name: 's', file: 'b64', tags: ['cool'] })).toEqual({
        name: 's',
        image: 'b64',
        tags: ['cool'],
      });
      expect(toStickerEditBody({ description: null })).toEqual({ description: null });
    });
  });

  describe('Guild', () => {
    it('toGuildEditBody maps systemChannelId and NSFW', () => {
      expect(
        toGuildEditBody({
          name: 'G',
          systemChannelId: 'c1',
          nsfwLevel: GuildNSFWLevel.AgeRestricted,
        }),
      ).toEqual({
        name: 'G',
        system_channel_id: 'c1',
        nsfw_level: GuildNSFWLevel.AgeRestricted,
      });
    });

    it('toGuildBanBody and toChannelPositionBody map snake_case', () => {
      expect(
        toGuildBanBody({
          reason: 'spam',
          deleteMessageDays: 1,
          deleteMessageSeconds: 3600,
          banDurationSeconds: 60,
        }),
      ).toEqual({
        reason: 'spam',
        delete_message_days: 1,
        delete_message_seconds: 3600,
        ban_duration_seconds: 60,
      });
      expect(
        toChannelPositionBody([{ id: 'c1', position: 2, parentId: 'p', lockPermissions: true }]),
      ).toEqual([{ id: 'c1', position: 2, parent_id: 'p', lock_permissions: true }]);
    });

    it('toRoleCreateBody maps name/color/permissions only', () => {
      expect(toRoleCreateBody({ name: 'mod', color: 1 })).toEqual({
        name: 'mod',
        color: 1,
      });
      expect(toRoleCreateBody({ permissions: '8' })).toEqual({ permissions: '8' });
      expect(toRoleCreateBody({ permissions: PermissionFlags.Administrator })).toEqual({
        permissions: '8',
      });
    });

    it('toRoleEditBody maps hoist and mentionable, not unicodeEmoji', () => {
      expect(toRoleEditBody({ name: 'mod', hoist: true, hoistPosition: null })).toEqual({
        name: 'mod',
        hoist: true,
        hoist_position: null,
      });
    });
  });

  describe('Members', () => {
    it('toMemberSearchBody / toMemberEditBody map filters and profile fields', () => {
      expect(
        toMemberSearchBody({
          query: 'al',
          roleIds: ['r1'],
          joinedAtGte: 1,
          sortBy: 'joinedAt',
          sortOrder: 'desc',
          joinSourceType: [1],
          sourceInviteCode: ['abc'],
        }),
      ).toEqual({
        query: 'al',
        role_ids: ['r1'],
        joined_at_gte: 1,
        sort_by: 'joinedAt',
        sort_order: 'desc',
        join_source_type: [1],
        source_invite_code: ['abc'],
      });
      expect(
        toMemberEditBody({
          nick: 'N',
          accentColor: 1,
          communicationDisabledUntil: null,
          channelId: 'c1',
        }),
      ).toEqual({
        nick: 'N',
        accent_color: 1,
        communication_disabled_until: null,
        channel_id: 'c1',
      });
    });
  });

  describe('Messages', () => {
    it('toBulkFetchWire maps channelId and optional cursors', () => {
      expect(
        toBulkFetchWire([
          { channelId: 'c1', limit: 50, before: 'm1' },
          { channelId: 'c2', limit: 10 },
        ]),
      ).toEqual([
        { channel_id: 'c1', limit: 50, before: 'm1' },
        { channel_id: 'c2', limit: 10 },
      ]);
    });

    it('toMessageSearchBody always sends scope current', () => {
      expect(toMessageSearchBody({})).toEqual({ scope: 'current' });
      expect(toMessageSearchBody({ content: 'hi', channelIds: ['c1'] })).toEqual({
        scope: 'current',
        content: 'hi',
        channel_id: ['c1'],
        channel_ids: ['c1'],
      });
    });

    it('toMessageSearchBody maps remaining camelCase filters', () => {
      expect(
        toMessageSearchBody({
          has: ['image'],
          excludeHas: ['link'],
          sortBy: 'timestamp',
          sortOrder: 'desc',
          excludeMentions: ['u1'],
          mentionEveryone: true,
          excludeAuthorType: ['bot'],
        }),
      ).toEqual({
        scope: 'current',
        has: ['image'],
        exclude_has: ['link'],
        sort_by: 'timestamp',
        sort_order: 'desc',
        exclude_mentions: ['u1'],
        mention_everyone: true,
        exclude_author_type: ['bot'],
      });
    });

    it('toMessageSearchResponse maps hits_per_page and indexing', () => {
      expect(toMessageSearchResponse({ indexing: true })).toEqual({ indexing: true });
      expect(
        toMessageSearchResponse({
          messages: [],
          channels: [],
          total: 2,
          hits_per_page: 25,
          page: 1,
          cursor: ['c'],
        }),
      ).toEqual({
        messages: [],
        channels: [],
        total: 2,
        hitsPerPage: 25,
        page: 1,
        cursor: ['c'],
      });
    });
  });

  describe('Presence / Profile / Sudo', () => {
    it('toPresenceWire maps status and customStatus', () => {
      expect(toPresenceWire({ status: 'online' })).toEqual({ status: 'online' });
      expect(toPresenceWire({ status: 'dnd', customStatus: null })).toEqual({
        status: 'dnd',
        custom_status: null,
      });
      expect(
        toPresenceWire({
          status: 'idle',
          customStatus: { text: 'hi', emojiName: 'wave', emojiId: '1' },
        }),
      ).toEqual({
        status: 'idle',
        custom_status: { text: 'hi', emoji_name: 'wave', emoji_id: '1' },
      });
    });

    it('toProfilePayload maps nested user_profile colors', () => {
      expect(
        toProfilePayload({
          user_profile: { bio: 'b', accent_color: 5, banner_color: 6 },
          mutual_guild_ids: ['g1'],
        }),
      ).toEqual({
        userProfile: { bio: 'b', accentColor: 5, bannerColor: 6 },
        mutualGuildIds: ['g1'],
      });
    });

    it('toSudoBody maps mfa fields', () => {
      expect(
        toSudoBody({
          password: 'x',
          mfaMethod: 'totp',
          mfaCode: '123456',
        }),
      ).toEqual({
        password: 'x',
        mfa_method: 'totp',
        mfa_code: '123456',
      });
    });
  });
});
