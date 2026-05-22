import { LibSQLStore } from '@mastra/libsql';
import { Memory } from '@mastra/memory';
import path from 'node:path';

const dbPath = path.join(process.cwd(), 'mastra.db');

export const chatMemory = new Memory({
  storage: new LibSQLStore({ id: 'mastra', url: `file:${dbPath}` }),
  options: {
    lastMessages: 30,
  },
});
