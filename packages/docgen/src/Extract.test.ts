import * as ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { getExamplesFromJSDoc, isOverloadImplementation } from './Extract.js';
import { isGhostSymbol, isHiddenMember, isWireConverterName } from './Filter.js';
import { visitSourceFile } from './Visitor.js';

describe('getExamplesFromJSDoc', () => {
  it('extracts a multi-line @example', () => {
    const comment = `/**
 * Reply to this message.
 * @example
 * await message.reply('Pong!');
 * await message.reply('No ping!', { ping: false });
 */`;
    expect(getExamplesFromJSDoc(comment)).toEqual([
      "await message.reply('Pong!');\nawait message.reply('No ping!', { ping: false });",
    ]);
  });

  it('extracts a fetch-then-delete example', () => {
    const comment = `/**
 * Delete this channel.
 * @example
 * const channel = await client.channels.fetch(channelId);
 * await channel.delete();
 */`;
    const examples = getExamplesFromJSDoc(comment);
    expect(examples[0]).toContain('client.channels.fetch');
    expect(examples[0]).toContain('channel.delete()');
  });
});

describe('docgen filters', () => {
  it('hides Discord ghost symbols', () => {
    expect(isGhostSymbol('Interaction')).toBe(true);
    expect(isGhostSymbol('StageChannel')).toBe(true);
    expect(isGhostSymbol('ThreadChannel')).toBe(true);
    expect(isGhostSymbol('Channel')).toBe(false);
  });

  it('hides internals and wire converters', () => {
    expect(isHiddenMember('_send', '')).toBe(true);
    expect(isHiddenMember('#messages', '')).toBe(true);
    expect(isHiddenMember('toJSON', '')).toBe(true);
    expect(isHiddenMember('delete', '/** @internal */')).toBe(true);
    expect(isHiddenMember('delete', '/** Delete this channel. */')).toBe(false);
    expect(isWireConverterName('toApiRole')).toBe(true);
  });
});

describe('isOverloadImplementation', () => {
  it('skips the implementation when overload signatures exist', () => {
    const sf = ts.createSourceFile(
      'fixture.ts',
      `class C {
        on(event: string): this;
        on(event: string | symbol): this;
        on(event: string | symbol): this { return this; }
      }`,
      ts.ScriptTarget.Latest,
      true,
    );
    const cls = sf.statements[0] as ts.ClassDeclaration;
    const methods = cls.members.filter(ts.isMethodDeclaration);
    expect(methods).toHaveLength(3);
    expect(isOverloadImplementation(methods[0]!, cls.members)).toBe(false);
    expect(isOverloadImplementation(methods[1]!, cls.members)).toBe(false);
    expect(isOverloadImplementation(methods[2]!, cls.members)).toBe(true);
  });
});

function docsFrom(code: string) {
  const fileName = '/fixture.ts';
  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    strict: true,
    skipLibCheck: true,
    noLib: true,
  };
  const sourceFile = ts.createSourceFile(fileName, code, ts.ScriptTarget.ES2022, true);
  const host: ts.CompilerHost = {
    getSourceFile: (name) => (name === fileName ? sourceFile : undefined),
    getDefaultLibFileName: () => 'lib.d.ts',
    writeFile: () => undefined,
    getCurrentDirectory: () => '/',
    getCanonicalFileName: (f) => f,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => '\n',
    fileExists: (n) => n === fileName,
    readFile: (n) => (n === fileName ? code : undefined),
  };
  const program = ts.createProgram([fileName], options, host);
  return visitSourceFile(program.getTypeChecker(), program.getSourceFile(fileName)!);
}

describe('extractConstFunctionMap', () => {
  it('documents a Routes-like const as a named type with helpers', () => {
    const { interfaces } = docsFrom(`
      /**
       * REST path helpers.
       * @example
       * await client.rest.get(Routes.channel(id));
       */
      export const Routes = {
        // Channels
        channel: (id: string) => \`/channels/\${id}\` as const,
        channelMessages: (id: string) => \`/channels/\${id}/messages\` as const,
        channelMessage: (channelId: string, messageId: string) =>
          \`/channels/\${channelId}/messages/\${messageId}\` as const,
        guild: (id: string) => \`/guilds/\${id}\` as const,
        guilds: () => '/guilds' as const,
        user: (id: string) => \`/users/\${id}\` as const,
        currentUser: () => '/users/@me' as const,
        gatewayBot: () => '/gateway/bot' as const,
      } as const;
    `);
    expect(interfaces).toHaveLength(1);
    const routes = interfaces[0]!;
    expect(routes.name).toBe('Routes');
    expect(routes.properties.map((p) => p.name)).toEqual([
      'channel',
      'channelMessage',
      'channelMessages',
      'currentUser',
      'gatewayBot',
      'guild',
      'guilds',
      'user',
    ]);
    expect(routes.properties.find((p) => p.name === 'channel')?.type).toBe(
      // biome-ignore lint/suspicious/noTemplateCurlyInString: asserts documented type text
      '(id: string) => `/channels/${id}`',
    );
    expect(routes.properties.find((p) => p.name === 'channel')?.description).toBeUndefined();
    expect(routes.typeSignature).toBeUndefined();
    expect(routes.examples?.[0]).toContain('client.rest.get');
  });

  it('does not document flag maps or tiny objects', () => {
    const { interfaces, enums } = docsFrom(`
      export const MessageFlags = {
        Crossposted: 1,
        IsCrosspost: 2,
        SuppressEmbeds: 4,
        SourceMessageDeleted: 8,
        Urgent: 16,
        HasThread: 32,
        Ephemeral: 64,
        Loading: 128,
      } as const;
      export const Tiny = {
        a: (id: string) => id,
        b: (id: string) => id,
      };
      export const guildResourceHandlers = {
        GUILD_EMOJIS_UPDATE(client: unknown, d: unknown) { return d; },
        GUILD_STICKERS_UPDATE(client: unknown, d: unknown) { return d; },
        GUILD_BAN_ADD(client: unknown, d: unknown) { return d; },
        GUILD_BAN_REMOVE(client: unknown, d: unknown) { return d; },
        GUILD_ROLE_CREATE(client: unknown, d: unknown) { return d; },
        GUILD_ROLE_UPDATE(client: unknown, d: unknown) { return d; },
        GUILD_ROLE_DELETE(client: unknown, d: unknown) { return d; },
        GUILD_AUDIT_LOG(client: unknown, d: unknown) { return d; },
        GUILD_UPDATE(client: unknown, d: unknown) { return d; },
      };
    `);
    expect(interfaces.map((i) => i.name)).toEqual([]);
    expect(enums.map((e) => e.name)).toEqual([]);
  });

  it('documents a string const map like Events as an enum', () => {
    const { enums, interfaces } = docsFrom(`
      /** Event name constants for client.on(Events.X, handler). */
      export const Events = {
        Ready: 'ready',
        MessageCreate: 'messageCreate',
        MessageUpdate: 'messageUpdate',
        MessageDelete: 'messageDelete',
        GuildCreate: 'guildCreate',
        GuildUpdate: 'guildUpdate',
        ChannelCreate: 'channelCreate',
        ChannelDelete: 'channelDelete',
        Error: 'error',
        Debug: 'debug',
      } as const;
    `);
    expect(interfaces).toHaveLength(0);
    expect(enums).toHaveLength(1);
    const events = enums[0]!;
    expect(events.name).toBe('Events');
    expect(events.kind).toBe('enum');
    expect(events.members.find((m) => m.name === 'MessageCreate')).toEqual({
      name: 'MessageCreate',
      value: 'messageCreate',
    });
  });
});
