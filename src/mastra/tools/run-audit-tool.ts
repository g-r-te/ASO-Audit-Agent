import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import {
  fetchCompetitors,
  fetchListingDetails,
  parseAppStoreUrl,
} from '@/lib/app-store';

export const runAuditTool = createTool({
  id: 'run-aso-audit',
  description:
    'Run the full ASO audit after the user confirms the app. Gathers listing data and competitors, then returns structured context for the audit report.',
  inputSchema: z.object({
    url: z.string().describe('Confirmed App Store URL'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    auditReport: z.string().optional(),
    listingJson: z.string().optional(),
    competitorsJson: z.string().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ url }: { url: string }, { mastra }: { mastra: any }) => {
    const parsed = parseAppStoreUrl(url);
    if (!parsed) {
      return { success: false, error: 'Invalid App Store URL' };
    }

    const listing = await fetchListingDetails(parsed);
    if (!listing) {
      return { success: false, error: 'Failed to fetch listing details' };
    }

    const competitors = await fetchCompetitors(
      listing.category,
      listing.appId,
      parsed.country,
    );

    const auditAgentInstance = mastra?.getAgent('auditAgent');
    if (!auditAgentInstance) {
      return { success: false, error: 'Audit agent not configured' };
    }

    const prompt = buildAuditPrompt(
      listing as unknown as Record<string, unknown>,
      competitors as unknown as Record<string, unknown>[],
    );
    const result = await auditAgentInstance.generate(prompt);

    return {
      success: true,
      auditReport: result.text ?? 'Audit could not be generated.',
      listingJson: JSON.stringify(listing, null, 2),
      competitorsJson: JSON.stringify(competitors, null, 2),
    };
  },
});

function buildAuditPrompt(
  listing: Record<string, unknown>,
  competitors: Record<string, unknown>[],
): string {
  return [
    'Perform a full ASO audit using the aso-audit skill framework.',
    'Use ONLY the data below — cite specific fields as evidence.',
    '',
    '## Listing data',
    '```json',
    JSON.stringify(listing, null, 2),
    '```',
    '',
    '## Top competitors',
    '```json',
    JSON.stringify(competitors, null, 2),
    '```',
    '',
    'Produce the complete markdown report with score card, quick wins, high-impact changes, strategic recommendations, and competitor table.',
  ].join('\n');
}
