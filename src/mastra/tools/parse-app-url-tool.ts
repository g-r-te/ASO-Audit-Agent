import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { parseAppStoreUrl } from '@/lib/app-store';

export const parseAppUrlTool = createTool({
  id: 'parse-app-store-url',
  description:
    'Parse an Apple App Store URL or app ID into structured appId and country. Use when the user pastes a link.',
  inputSchema: z.object({
    url: z.string().describe('App Store URL or text containing id123456789'),
  }),
  outputSchema: z.object({
    valid: z.boolean(),
    appId: z.string().optional(),
    country: z.string().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ url }: { url: string }) => {
    const parsed = parseAppStoreUrl(url);
    if (!parsed) {
      return {
        valid: false,
        error:
          'Could not parse App Store URL. Expected format: https://apps.apple.com/us/app/name/id123456789',
      };
    }
    return {
      valid: true,
      appId: parsed.appId,
      country: parsed.country,
    };
  },
});
