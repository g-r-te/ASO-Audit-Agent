export interface ParsedAppStoreUrl {
  appId: string;
  country: string;
  url: string;
}

export interface AppSurfaceMetadata {
  appId: string;
  name: string;
  developer: string;
  iconUrl: string;
  category: string;
  country: string;
  storeUrl: string;
}

export interface AppListingDetails extends AppSurfaceMetadata {
  subtitle?: string;
  description: string;
  keywords?: string;
  promotionalText?: string;
  version: string;
  releaseNotes?: string;
  price: number;
  currency: string;
  averageRating: number;
  ratingCount: number;
  screenshotUrls: string[];
  genres: string[];
  contentRating?: string;
  bundleId?: string;
  fileSizeBytes?: number;
  minimumOsVersion?: string;
  supportedDevices?: string[];
  hasVideoPreview?: boolean;
}

export interface CompetitorSummary {
  name: string;
  developer: string;
  averageRating: number;
  ratingCount: number;
  price: number;
  storeUrl: string;
}

export interface DimensionScore {
  dimension: string;
  weight: number;
  score: number;
  maxScore: number;
  notes: string;
}

export interface AuditReport {
  overallScore: number;
  dimensions: DimensionScore[];
  quickWins: Recommendation[];
  highImpact: Recommendation[];
  strategic: Recommendation[];
  competitors: CompetitorComparison[];
  markdown: string;
}

export interface Recommendation {
  title: string;
  evidence: string;
  before?: string;
  after?: string;
}

export interface CompetitorComparison {
  metric: string;
  app: string;
  competitors: string[];
}
