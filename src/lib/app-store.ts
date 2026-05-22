import type {
  AppListingDetails,
  AppSurfaceMetadata,
  CompetitorSummary,
  ParsedAppStoreUrl,
} from './types';

const APP_STORE_URL_RE =
  /apps\.apple\.com\/([a-z]{2})\/app\/[^/]+\/id(\d+)/i;
const APP_ID_RE = /id(\d+)/i;

export function parseAppStoreUrl(input: string): ParsedAppStoreUrl | null {
  const trimmed = input.trim();
  const match = trimmed.match(APP_STORE_URL_RE);
  if (match) {
    return {
      country: match[1].toLowerCase(),
      appId: match[2],
      url: trimmed,
    };
  }

  const idMatch = trimmed.match(APP_ID_RE);
  if (idMatch) {
    return {
      country: 'us',
      appId: idMatch[1],
      url: `https://apps.apple.com/us/app/id${idMatch[1]}`,
    };
  }

  return null;
}

interface ItunesResult {
  trackId: number;
  trackName: string;
  artistName: string;
  artworkUrl512?: string;
  artworkUrl100?: string;
  primaryGenreName: string;
  description?: string;
  screenshotUrls?: string[];
  averageUserRating?: number;
  userRatingCount?: number;
  version?: string;
  price?: number;
  currency?: string;
  genres?: string[];
  contentAdvisoryRating?: string;
  bundleId?: string;
  fileSizeBytes?: number;
  minimumOsVersion?: string;
  supportedDevices?: string[];
  trackViewUrl: string;
  releaseNotes?: string;
  sellerName?: string;
}

async function itunesLookup(
  appId: string,
  country: string,
): Promise<ItunesResult | null> {
  const url = new URL('https://itunes.apple.com/lookup');
  url.searchParams.set('id', appId);
  url.searchParams.set('country', country);

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!res.ok) return null;

  const data = (await res.json()) as { resultCount: number; results: ItunesResult[] };
  return data.resultCount > 0 ? data.results[0] : null;
}

export async function fetchSurfaceMetadata(
  parsed: ParsedAppStoreUrl,
): Promise<AppSurfaceMetadata | null> {
  const result = await itunesLookup(parsed.appId, parsed.country);
  if (!result) return null;

  return {
    appId: String(result.trackId),
    name: result.trackName,
    developer: result.sellerName ?? result.artistName,
    iconUrl: result.artworkUrl512 ?? result.artworkUrl100 ?? '',
    category: result.primaryGenreName,
    country: parsed.country.toUpperCase(),
    storeUrl: result.trackViewUrl ?? parsed.url,
  };
}

export async function fetchListingDetails(
  parsed: ParsedAppStoreUrl,
): Promise<AppListingDetails | null> {
  const result = await itunesLookup(parsed.appId, parsed.country);
  if (!result) return null;

  const scraped = await scrapeStorePageExtras(parsed.url).catch(() => ({}));

  return {
    appId: String(result.trackId),
    name: result.trackName,
    developer: result.sellerName ?? result.artistName,
    iconUrl: result.artworkUrl512 ?? result.artworkUrl100 ?? '',
    category: result.primaryGenreName,
    country: parsed.country.toUpperCase(),
    storeUrl: result.trackViewUrl ?? parsed.url,
    subtitle: (scraped as ScrapedExtras).subtitle,
    description: result.description ?? (scraped as ScrapedExtras).description ?? 'No description available.',
    keywords: (scraped as ScrapedExtras).keywords,
    promotionalText: (scraped as ScrapedExtras).promotionalText,
    version: result.version ?? 'Unknown',
    releaseNotes: result.releaseNotes,
    price: result.price ?? 0,
    currency: result.currency ?? 'USD',
    averageRating: result.averageUserRating ?? 0,
    ratingCount: result.userRatingCount ?? 0,
    screenshotUrls: result.screenshotUrls ?? [],
    genres: result.genres ?? [result.primaryGenreName],
    contentRating: result.contentAdvisoryRating,
    bundleId: result.bundleId,
    fileSizeBytes: result.fileSizeBytes,
    minimumOsVersion: result.minimumOsVersion,
    supportedDevices: result.supportedDevices,
    hasVideoPreview: (scraped as ScrapedExtras).hasVideoPreview ?? false,
  };
}

interface ScrapedExtras {
  subtitle?: string;
  keywords?: string;
  promotionalText?: string;
  description?: string;
  hasVideoPreview?: boolean;
}

async function scrapeStorePageExtras(url: string): Promise<ScrapedExtras> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    return scrapeHtmlFallback(url);
  }

  const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      formats: ['html', 'markdown'],
      onlyMainContent: true,
    }),
  });

  if (!res.ok) return scrapeHtmlFallback(url);

  const data = (await res.json()) as {
    success?: boolean;
    data?: { html?: string; markdown?: string };
  };

  const html = data.data?.html ?? '';
  const markdown = data.data?.markdown ?? '';
  return extractFromPageContent(html + '\n' + markdown);
}

async function scrapeHtmlFallback(url: string): Promise<ScrapedExtras> {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; ASOAuditBot/1.0; +https://github.com/aso-audit)',
      Accept: 'text/html',
    },
    cache: 'no-store',
  });

  if (!res.ok) return {};
  const html = await res.text();
  return extractFromPageContent(html);
}

function extractFromPageContent(content: string): ScrapedExtras {
  const extras: ScrapedExtras = {};

  const subtitleMatch =
    content.match(/"subtitle"\s*:\s*"([^"]+)"/i) ??
    content.match(/class="[^"]*subtitle[^"]*"[^>]*>([^<]+)</i);
  if (subtitleMatch) extras.subtitle = decodeHtml(subtitleMatch[1]);

  const promoMatch = content.match(/"promotionalText"\s*:\s*"([^"]+)"/i);
  if (promoMatch) extras.promotionalText = decodeHtml(promoMatch[1]);

  const keywordsMatch = content.match(/keywords?[:\s]+([^\n<]{10,120})/i);
  if (keywordsMatch) extras.keywords = keywordsMatch[1].trim();

  extras.hasVideoPreview =
    /app-previews|video-preview|preview-video/i.test(content);

  return extras;
}

function decodeHtml(value: string): string {
  return value
    .replace(/\\u0026/g, '&')
    .replace(/\\u003c/g, '<')
    .replace(/\\u003e/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'");
}

export async function fetchCompetitors(
  genre: string,
  excludeAppId: string,
  country: string,
  limit = 3,
): Promise<CompetitorSummary[]> {
  const url = new URL('https://itunes.apple.com/search');
  url.searchParams.set('term', genre);
  url.searchParams.set('media', 'software');
  url.searchParams.set('entity', 'software');
  url.searchParams.set('country', country);
  url.searchParams.set('limit', '25');

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!res.ok) return [];

  const data = (await res.json()) as { results: ItunesResult[] };

  return data.results
    .filter((r) => String(r.trackId) !== excludeAppId)
    .slice(0, limit)
    .map((r) => ({
      name: r.trackName,
      developer: r.artistName,
      averageRating: r.averageUserRating ?? 0,
      ratingCount: r.userRatingCount ?? 0,
      price: r.price ?? 0,
      storeUrl: r.trackViewUrl,
    }));
}

export function formatMetadataConfirmation(meta: AppSurfaceMetadata): string {
  return [
    '**App found — please confirm**',
    '',
    `| | |`,
    `|---|---|`,
    `| **App** | ${meta.name} |`,
    `| **Developer** | ${meta.developer} |`,
    `| **Category** | ${meta.category} |`,
    `| **Store** | ${meta.country} |`,
    `| **Link** | [View on App Store](${meta.storeUrl}) |`,
    '',
    `![${meta.name} icon](${meta.iconUrl})`,
    '',
    'Reply **yes** to run the full ASO audit, or paste a different URL.',
  ].join('\n');
}
