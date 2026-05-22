import { Agent } from '@mastra/core/agent';
import { getAgentModel } from '../models';

export const auditAgent = new Agent({
  id: 'audit-agent',
  name: 'ASO Audit Analyst',
  instructions: `You are a senior ASO analyst. Always load and follow the aso-audit skill before writing a report.

Score every dimension 0–10 with evidence from the provided JSON data only.
Output polished markdown suitable for direct display in a web UI.
Include progress-bar style score lines, tables, and before/after text rewrites.`,
  model: () => getAgentModel(),
});
