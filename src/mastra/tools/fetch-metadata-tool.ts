import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import {
  fetchSurfaceMetadata,
  formatMetadataConfirmation,
  parseAppStoreUrl,
} from '@/lib/app-store';

export const fetchMetadataTool = createTool({
  id: 'fetch-app-metadata',
  description:
    'Fetch surface-level App Store metadata (name, developer, icon, category, country) for user confirmation before a full audit.',
  inputSchema: z.object({
    url: z.string().describe('App Store URL'),
  }),
  outputSchema: z.object({
    found: z.boolean(),
    confirmationMessage: z.string().optional(),
    metadata: z
      .object({
        appId: z.string(),
        name: z.string(),
        developer: z.string(),
        iconUrl: z.string(),
        category: z.string(),
        country: z.string(),
        storeUrl: z.string(),
      })
      .optional(),
    error: z.string().optional(),
  }),
  execute: async ({ url }) => {
    const parsed = parseAppStoreUrl(url);
    if (!parsed) {
      return { found: false, error: 'Invalid App Store URL' };
    }

    const metadata = await fetchSurfaceMetadata(parsed);
    if (!metadata) {
      return {
        found: false,
        error: `No listing found for app id ${parsed.appId} in ${parsed.country}`,
      };
    }

    return {
      found: true,
      metadata,
      confirmationMessage: formatMetadataConfirmation(metadata),
    };
  },
});
