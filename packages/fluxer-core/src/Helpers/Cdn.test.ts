import { describe, expect, it } from 'vitest';
import {
  CDN_SIZE_LADDER,
  cdnAvatarURL,
  cdnBannerURL,
  cdnDefaultAvatarURL,
  cdnDisplayAvatarURL,
  cdnEmojiURL,
  cdnGuildAssetURL,
  cdnMemberAvatarURL,
  cdnMemberBannerURL,
  cdnStickerURL,
  snapCdnSize,
} from './Cdn.js';

describe('cdnAvatarURL', () => {
  it('returns null for null hash', () => {
    expect(cdnAvatarURL('123', null)).toBeNull();
  });

  it('builds avatar URL with default extension', () => {
    const url = cdnAvatarURL('123456789012345678', 'abc123hash');
    expect(url).toContain('fluxerusercontent.com/avatars/123456789012345678/abc123hash.png');
  });

  it('uses custom mediaBase when provided', () => {
    const url = cdnAvatarURL('123', 'hash', { mediaBase: 'https://media.example' });
    expect(url).toBe('https://media.example/avatars/123/hash.png');
  });

  it('uses gif for a_ prefix (animated)', () => {
    const url = cdnAvatarURL('123', 'a_animatedhash');
    expect(url).toContain('.gif');
  });

  it('appends size when provided', () => {
    const url = cdnAvatarURL('123', 'hash', { size: 256 });
    expect(url).toContain('?size=256');
  });

  it('snaps icon size to the ladder then clamps to 128-1024', () => {
    expect(cdnAvatarURL('123', 'hash', { size: 110 })).toContain('?size=128');
    expect(cdnAvatarURL('123', 'hash', { size: 64 })).toContain('?size=128');
    expect(cdnAvatarURL('123', 'hash', { size: 2000 })).toContain('?size=1024');
  });

  it('uses custom extension', () => {
    const url = cdnAvatarURL('123', 'hash', { extension: 'webp' });
    expect(url).toContain('.webp');
  });
});

describe('cdnDisplayAvatarURL', () => {
  it('returns default avatar when hash is null', () => {
    const url = cdnDisplayAvatarURL('123', null);
    expect(url).toContain('fluxerstatic.com/avatars/');
    expect(url).toContain('.png');
  });

  it('returns custom avatar when hash present', () => {
    const url = cdnDisplayAvatarURL('123', 'abc');
    expect(url).toContain('fluxerusercontent.com/avatars/');
  });
});

describe('cdnBannerURL', () => {
  it('returns null for null hash', () => {
    expect(cdnBannerURL('123', null)).toBeNull();
  });

  it('builds banner URL', () => {
    const url = cdnBannerURL('123456789012345678', 'bannerhash');
    expect(url).toContain('fluxerusercontent.com/banners/123456789012345678/bannerhash.png');
  });

  it('uses gif for a_ prefix', () => {
    const url = cdnBannerURL('123', 'a_banner');
    expect(url).toContain('.gif');
  });

  it('snaps banner size then clamps to 480-2400 (ladder max 2048)', () => {
    expect(cdnBannerURL('123', 'hash', { size: 16 })).toContain('?size=480');
    expect(cdnBannerURL('123', 'hash', { size: 600 })).toContain('?size=600');
    expect(cdnBannerURL('123', 'hash', { size: 2800 })).toContain('?size=2048');
  });
});

describe('cdnMemberAvatarURL', () => {
  it('returns null for null hash', () => {
    expect(cdnMemberAvatarURL('g1', 'u1', null)).toBeNull();
  });

  it('builds member avatar URL', () => {
    const url = cdnMemberAvatarURL('guild123', 'user456', 'memberhash');
    expect(url).toContain(
      'fluxerusercontent.com/guilds/guild123/users/user456/avatars/memberhash.png',
    );
  });
});

describe('cdnMemberBannerURL', () => {
  it('returns null for null hash', () => {
    expect(cdnMemberBannerURL('g1', 'u1', null)).toBeNull();
  });

  it('builds member banner URL', () => {
    const url = cdnMemberBannerURL('guild123', 'user456', 'bannerhash');
    expect(url).toContain(
      'fluxerusercontent.com/guilds/guild123/users/user456/banners/bannerhash.png',
    );
  });
});

describe('cdnDefaultAvatarURL', () => {
  it('returns URL with index 0-5 from user ID', () => {
    const url = cdnDefaultAvatarURL('0');
    expect(url).toContain('fluxerstatic.com/avatars/');
    expect(url).toContain('.png');
  });

  it('accepts numeric index', () => {
    const url = cdnDefaultAvatarURL(3);
    expect(url).toContain('/avatars/3.png');
  });

  it('handles negative index by taking abs and mod', () => {
    const url = cdnDefaultAvatarURL(-1);
    expect(url).toContain('/avatars/1.png');
  });
});

describe('cdnGuildAssetURL / emoji / sticker size', () => {
  it('clamps guild icons as icon and splashes as banner', () => {
    expect(cdnGuildAssetURL('icons', 'g1', 'h', { size: 64 })).toContain('?size=128');
    expect(cdnGuildAssetURL('splashes', 'g1', 'h', { size: 16 })).toContain('?size=480');
    expect(cdnGuildAssetURL('banners', 'g1', 'h', { size: 512 })).toContain('?size=512');
  });

  it('clamps emoji to 32-512 and sticker to 128-512', () => {
    expect(cdnEmojiURL('e1', false, { size: 16 })).toContain('?size=32');
    expect(cdnEmojiURL('e1', false, { size: 256 })).toContain('?size=256');
    expect(cdnEmojiURL('e1', false, { size: 1024 })).toContain('?size=512');
    expect(cdnStickerURL('s1', false, { size: 64 })).toContain('?size=128');
    expect(cdnStickerURL('s1', true, { size: 480 })).toContain('?size=480');
    expect(cdnStickerURL('s1', false, { size: 2048 })).toContain('?size=512');
  });
});

describe('snapCdnSize', () => {
  it('uses the documented ladder', () => {
    expect(CDN_SIZE_LADDER).toContain(16);
    expect(CDN_SIZE_LADDER).toContain(16384);
    expect(snapCdnSize(256, 'icon')).toBe(256);
    expect(snapCdnSize(200, 'icon')).toBe(240);
    expect(snapCdnSize(144, 'icon')).toBe(160);
  });
});
