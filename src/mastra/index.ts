import { Mastra } from '@mastra/core';
import { LibSQLStore } from '@mastra/libsql';
import { Workspace, LocalFilesystem } from '@mastra/core/workspace';
import path from 'node:path';
import { asoChatAgent } from './agents/aso-chat-agent';
import { auditAgent } from './agents/audit-agent';
import { asoAuditWorkflow } from './workflows/aso-audit-workflow';

const projectRoot = process.cwd();
const dbPath = path.join(projectRoot, 'mastra.db');

const workspace = new Workspace({
  filesystem: new LocalFilesystem({ basePath: projectRoot }),
  skills: ['workspace/skills'],
});

export const mastra = new Mastra({
  agents: { asoChatAgent, auditAgent },
  workflows: { asoAuditWorkflow },
  storage: new LibSQLStore({
    id: 'mastra',
    url: `file:${dbPath}`,
  }),
  workspace,
});
