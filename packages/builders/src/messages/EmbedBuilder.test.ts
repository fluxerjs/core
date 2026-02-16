import { describe, it, expect } from 'vitest';
import { EmbedBuilder } from './EmbedBuilder.js';

describe('EmbedBuilder', () => {
  describe('setVideo', () => {
    it('sets video URL in toJSON output (type stays rich)', () => {
      const url = 'https://example.com/video.mp4';
      const embed = new EmbedBuilder().setTitle('Video embed').setVideo(url);
      const json = embed.toJSON();

      expect(json.video).toEqual({ url });
      expect(json.type).toBe('rich');
    });

    it('clears video when passed null', () => {
      const embed = new EmbedBuilder().setVideo('https://example.com/video.mp4').setVideo(null);
      const json = embed.toJSON();

      expect(json.video).toBeUndefined();
    });

    it('accepts full EmbedMediaOptions with duration, width, height', () => {
      const options = {
        url: 'https://example.com/video.mp4',
        duration: 120,
        width: 1920,
        height: 1080,
      };
      const embed = new EmbedBuilder().setTitle('Video').setVideo(options);
      const json = embed.toJSON();

      expect(json.video).toEqual({
        url: options.url,
        duration: 120,
        width: 1920,
        height: 1080,
      });
      expect(json.type).toBe('rich');
    });
  });

  describe('setAudio', () => {
    it('sets audio URL in toJSON output', () => {
      const url = 'https://example.com/audio.mp3';
      const embed = new EmbedBuilder().setTitle('Audio embed').setAudio(url);
      const json = embed.toJSON();

      expect(json.audio).toEqual({ url });
      expect(json.type).toBe('rich');
    });

    it('clears audio when passed null', () => {
      const embed = new EmbedBuilder().setAudio('https://example.com/audio.mp3').setAudio(null);
      const json = embed.toJSON();

      expect(json.audio).toBeUndefined();
    });

    it('accepts full EmbedMediaOptions with duration', () => {
      const options = {
        url: 'https://example.com/podcast.mp3',
        duration: 3600,
        content_type: 'audio/mpeg',
      };
      const embed = new EmbedBuilder().setTitle('Podcast').setAudio(options);
      const json = embed.toJSON();

      expect(json.audio).toEqual({
        url: options.url,
        duration: 3600,
        content_type: 'audio/mpeg',
      });
    });
  });

  describe('setImage and setThumbnail', () => {
    it('accept string URL (backward compatibility)', () => {
      const embed = new EmbedBuilder()
        .setImage('https://example.com/img.png')
        .setThumbnail('https://example.com/thumb.png');
      const json = embed.toJSON();

      expect(json.image).toEqual({ url: 'https://example.com/img.png' });
      expect(json.thumbnail).toEqual({ url: 'https://example.com/thumb.png' });
    });

    it('accept full EmbedMediaOptions with width and height', () => {
      const embed = new EmbedBuilder()
        .setImage({
          url: 'https://example.com/img.png',
          width: 800,
          height: 600,
        })
        .setThumbnail({
          url: 'https://example.com/thumb.png',
          width: 128,
          height: 128,
        });
      const json = embed.toJSON();

      expect(json.image).toEqual({
        url: 'https://example.com/img.png',
        width: 800,
        height: 600,
      });
      expect(json.thumbnail).toEqual({
        url: 'https://example.com/thumb.png',
        width: 128,
        height: 128,
      });
    });
  });

  describe('EmbedBuilder.from', () => {
    it('restores video from existing embed (type always rich)', () => {
      const source = {
        video: { url: 'https://media.tenor.com/videos/xyz.mp4' },
      };
      const rebuilt = EmbedBuilder.from(source);
      const json = rebuilt.toJSON();

      expect(json.video).toEqual(source.video);
      expect(json.type).toBe('rich');
    });

    it('preserves video and audio with full metadata', () => {
      const source = {
        video: {
          url: 'https://example.com/video.mp4',
          duration: 90,
          width: 1280,
          height: 720,
          flags: 0,
        },
        audio: {
          url: 'https://example.com/audio.mp3',
          duration: 180,
          content_type: 'audio/mpeg',
          flags: 0,
        },
      };
      const rebuilt = EmbedBuilder.from(source);
      const json = rebuilt.toJSON();

      expect(json.video).toEqual(source.video);
      expect(json.audio).toEqual(source.audio);
    });
  });
});
