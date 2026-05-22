import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import {
  fetchCompetitors,
  fetchListingDetails,
  fetchSurfaceMetadata,
  formatMetadataConfirmation,
  parseAppStoreUrl,
} from '@/lib/app-store';

const metadataSchema = z.object({
  appId: z.string(),
  name: z.string(),
  developer: z.string(),
  iconUrl: z.string(),
  category: z.string(),
  country: z.string(),
  storeUrl: z.string(),
});

const parseUrlStep = createStep({
  id: 'parse-url',
  inputSchema: z.object({ url: z.string() }),
  outputSchema: z.object({
    appId: z.string(),
    country: z.string(),
    url: z.string(),
  }),
  execute: async ({ inputData, bail }) => {
    const parsed = parseAppStoreUrl(inputData.url);
    if (!parsed) {
      return bail({ reason: 'Invalid App Store URL' });
    }
    return parsed;
  },
});

const fetchMetadataStep = createStep({
  id: 'fetch-metadata',
  inputSchema: z.object({
    appId: z.string(),
    country: z.string(),
    url: z.string(),
  }),
  outputSchema: z.object({
    metadata: metadataSchema,
    confirmationMessage: z.string(),
    url: z.string(),
    country: z.string(),
  }),
  execute: async ({ inputData, bail }) => {
    const metadata = await fetchSurfaceMetadata({
      appId: inputData.appId,
      country: inputData.country,
      url: inputData.url,
    });

    if (!metadata) {
      return bail({ reason: 'App not found in iTunes lookup' });
    }

    return {
      metadata,
      confirmationMessage: formatMetadataConfirmation(metadata),
      url: inputData.url,
      country: inputData.country,
    };
  },
});

const confirmAppStep = createStep({
  id: 'confirm-app',
  inputSchema: z.object({
    metadata: metadataSchema,
    confirmationMessage: z.string(),
    url: z.string(),
    country: z.string(),
  }),
  outputSchema: z.object({
    confirmed: z.boolean(),
    metadata: metadataSchema,
    url: z.string(),
    country: z.string(),
  }),
  resumeSchema: z.object({
    confirmed: z.boolean(),
  }),
  suspendSchema: z.object({
    reason: z.string(),
    confirmationMessage: z.string(),
    metadata: metadataSchema,
  }),
  execute: async ({ inputData, resumeData, suspend, bail }) => {
    const confirmed = resumeData?.confirmed;

    if (confirmed === false) {
      return bail({ reason: 'User declined — paste another URL to try again.' });
    }

    if (!confirmed) {
      return await suspend({
        reason: 'Waiting for user to confirm this is the correct app.',
        confirmationMessage: inputData.confirmationMessage,
        metadata: inputData.metadata,
      });
    }

    return {
      confirmed: true,
      metadata: inputData.metadata,
      url: inputData.url,
      country: inputData.country,
    };
  },
});

const gatherDataStep = createStep({
  id: 'gather-data',
  inputSchema: z.object({
    confirmed: z.boolean(),
    metadata: metadataSchema,
    url: z.string(),
    country: z.string(),
  }),
  outputSchema: z.object({
    listingJson: z.string(),
    competitorsJson: z.string(),
    auditPrompt: z.string(),
  }),
  execute: async ({ inputData, bail }) => {
    const parsed = parseAppStoreUrl(inputData.url);
    if (!parsed) {
      return bail({ reason: 'Invalid URL after confirmation' });
    }

    const listing = await fetchListingDetails(parsed);
    if (!listing) {
      return bail({ reason: 'Failed to fetch full listing' });
    }

    const competitors = await fetchCompetitors(
      listing.category,
      listing.appId,
      parsed.country,
    );

    const auditPrompt = [
      'Perform a full ASO audit using the aso-audit skill.',
      '## Listing',
      JSON.stringify(listing, null, 2),
      '## Competitors',
      JSON.stringify(competitors, null, 2),
    ].join('\n\n');

    return {
      listingJson: JSON.stringify(listing, null, 2),
      competitorsJson: JSON.stringify(competitors, null, 2),
      auditPrompt,
    };
  },
});

const generateReportStep = createStep({
  id: 'generate-report',
  inputSchema: z.object({
    listingJson: z.string(),
    competitorsJson: z.string(),
    auditPrompt: z.string(),
  }),
  outputSchema: z.object({
    report: z.string(),
  }),
  execute: async ({ inputData, mastra }) => {
    const agent = mastra.getAgent('auditAgent');
    const result = await agent.generate(inputData.auditPrompt);
    return {
      report: result.text ?? 'Audit could not be generated.',
    };
  },
});

export const asoAuditWorkflow = createWorkflow({
  id: 'aso-audit-workflow',
  description:
    'Parse App Store URL → fetch metadata → human confirmation → full ASO audit',
  inputSchema: z.object({ url: z.string() }),
  outputSchema: z.object({
    report: z.string(),
  }),
})
  .then(parseUrlStep)
  .then(fetchMetadataStep)
  .then(confirmAppStep)
  .then(gatherDataStep)
  .then(generateReportStep)
  .commit();
