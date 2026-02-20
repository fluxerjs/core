import { Client } from '../client/Client.js';

/** Base class for all Fluxer structures. Provides the client reference. */
export abstract class Base {
  /** The client instance this structure belongs to. */
  abstract readonly client: Client;
}
