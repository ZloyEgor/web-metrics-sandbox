export interface Platform {
  id: string;
  name: string;
  description: string;
  dockerService: string | null;
  port: number | null;
  externalUrl?: string; // For external demo platforms
  healthCheck: string | null;
  repoUrl: string;
  category: string;
}

export interface LighthouseDetailedMetrics {
  // Performance metrics
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  totalBlockingTime?: number;
  cumulativeLayoutShift?: number;
  speedIndex?: number;
  timeToInteractive?: number;
  
  // Accessibility issues
  accessibilityIssues?: string[];
  
  // SEO issues
  seoIssues?: string[];
  
  // Best practices issues
  bestPracticesIssues?: string[];
}

export interface LighthouseMetrics {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  pwa?: number;
  detailed?: LighthouseDetailedMetrics;
}

export interface PerformanceMetrics {
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
  cls?: number; // Cumulative Layout Shift
  tti?: number; // Time to Interactive
  tbt?: number; // Total Blocking Time
  loadTime: number;
  domContentLoaded: number;
  memoryUsage?: number;
}

export interface AvailabilityMetrics {
  status: 'online' | 'offline' | 'unknown';
  httpStatus?: number;
  responseTime: number;
  uptime: number; // percentage
  lastCheck: number;
}

export interface MetricsRecord {
  id?: number;
  platformId: string;
  timestamp: number;
  lighthouse?: LighthouseMetrics;
  performance?: PerformanceMetrics;
  availability?: AvailabilityMetrics;
}

export interface PlatformStatus {
  platform: Platform;
  status: 'running' | 'stopped' | 'unknown';
  lastMetrics?: MetricsRecord;
}

export type MetricType = 'lighthouse' | 'performance' | 'availability' | 'all';
