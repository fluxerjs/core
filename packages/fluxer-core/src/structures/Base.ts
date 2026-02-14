import type { Client } from '../client/Client.js';

export abstract class Base {
  abstract readonly client: Client;
}
