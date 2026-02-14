import type { Client } from './Client.js';
import { User } from '../structures/User.js';
import type { APIUserPartial } from '@fluxerjs/types';

export class ClientUser extends User {
  declare readonly client: Client;

  constructor(client: Client, data: APIUserPartial) {
    super(client, { ...data });
  }
}
