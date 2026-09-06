import { describe, it } from 'vitest';
import type { VoiceChannel } from './Guild.js';

type Assert<T extends true> = T;
type IsExactly<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

describe('VoiceChannel.guildId', () => {
  it('is string for voice join payloads', () => {
    const channel = { guildId: 'g1' } as VoiceChannel;
    type _guildId = Assert<IsExactly<(typeof channel)['guildId'], string>>;
    const guildId: string = channel.guildId;
    void guildId;
  });
});
