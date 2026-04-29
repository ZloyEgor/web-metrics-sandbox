import type {
  LighthouseMetrics,
  PerformanceMetrics,
  AvailabilityMetrics,
  Platform
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Helper to get platform URL
const getPlatformUrl = (platform: Platform): string => {
  if (platform.externalUrl) {
    return platform.externalUrl;
  }
  return `http://localhost:${platform.port}`;
};

// Lighthouse metrics collection
export const collectLighthouseMetrics = async (
  platform: Platform
): Promise<LighthouseMetrics | null> => {
  try {
    const url = getPlatformUrl(platform);
    const response = await fetch(`${API_BASE_URL}/api/lighthouse?url=${encodeURIComponent(url)}`);
    
    if (!response.ok) {
      throw new Error(`Lighthouse API returned ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      performance: Math.round((data.categories.performance?.score || 0) * 100),
      accessibility: Math.round((data.categories.accessibility?.score || 0) * 100),
      bestPractices: Math.round((data.categories['best-practices']?.score || 0) * 100),
      seo: Math.round((data.categories.seo?.score || 0) * 100),
      pwa: data.categories.pwa ? Math.round(data.categories.pwa.score * 100) : undefined,
      detailed: {
        // Performance metrics (convert ms to seconds for display)
        firstContentfulPaint: data.audits['first-contentful-paint']?.numericValue,
        largestContentfulPaint: data.audits['largest-contentful-paint']?.numericValue,
        totalBlockingTime: data.audits['total-blocking-time']?.numericValue,
        cumulativeLayoutShift: data.audits['cumulative-layout-shift']?.numericValue,
        speedIndex: data.audits['speed-index']?.numericValue,
        timeToInteractive: data.audits['time-to-interactive']?.numericValue,
        
        // Issues
        accessibilityIssues: data.issues?.accessibility?.map((issue: any) => issue.title) || [],
        seoIssues: data.issues?.seo?.map((issue: any) => issue.title) || [],
        bestPracticesIssues: data.issues?.['best-practices']?.map((issue: any) => issue.title) || []
      }
    };
  } catch (error) {
    console.error(`Failed to collect Lighthouse metrics for ${platform.name}:`, error);
    return null;
  }
};

// Performance metrics: probe the platform via the backend so we are not
// blocked by mixed-content (https page -> http target) or X-Frame-Options.
// The backend follows redirects and reports total response time + bytes.
export const collectPerformanceMetrics = async (
  platform: Platform
): Promise<PerformanceMetrics | null> => {
  try {
    const url = getPlatformUrl(platform);
    const response = await fetch(
      `${API_BASE_URL}/api/check/performance?url=${encodeURIComponent(url)}`
    );
    if (!response.ok) return null;
    const data = await response.json();
    if (data.status !== 'online') return null;
    return {
      loadTime: data.loadTimeMs,
      domContentLoaded: 0
    };
  } catch (error) {
    console.error(`Failed to collect performance metrics for ${platform.name}:`, error);
    return null;
  }
};

// Availability check: ask the backend to probe the platform. This avoids
// mixed-content blocks and CORS issues entirely.
export const collectAvailabilityMetrics = async (
  platform: Platform
): Promise<AvailabilityMetrics> => {
  const baseUrl = getPlatformUrl(platform);
  const url = platform.healthCheck ? `${baseUrl}${platform.healthCheck}` : baseUrl;

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/check/availability?url=${encodeURIComponent(url)}`
    );
    const data = await response.json();
    const online = data.status === 'online';
    return {
      status: online ? 'online' : 'offline',
      httpStatus: typeof data.httpStatus === 'number' ? data.httpStatus : undefined,
      responseTime: data.responseTimeMs ?? 0,
      uptime: online ? 100 : 0,
      lastCheck: Date.now()
    };
  } catch {
    return {
      status: 'offline',
      responseTime: 0,
      uptime: 0,
      lastCheck: Date.now()
    };
  }
};

// Collect all metrics for a platform with progress tracking
export const collectAllMetrics = async (
  platform: Platform,
  onProgress?: (step: string, progress: number) => void
) => {
  const results: any = {};
  
  // Lighthouse
  if (onProgress) onProgress('Сбор Lighthouse метрик...', 33);
  results.lighthouse = await collectLighthouseMetrics(platform);
  
  // Performance
  if (onProgress) onProgress('Сбор Performance метрик...', 66);
  results.performance = await collectPerformanceMetrics(platform);
  
  // Availability
  if (onProgress) onProgress('Проверка доступности...', 90);
  results.availability = await collectAvailabilityMetrics(platform);
  
  if (onProgress) onProgress('Завершено!', 100);
  
  return {
    lighthouse: results.lighthouse || undefined,
    performance: results.performance || undefined,
    availability: results.availability
  };
};

// Batch collect metrics for multiple platforms
export const collectMetricsForPlatforms = async (
  platforms: Platform[],
  onProgress?: (platformId: string, completed: number, total: number) => void
) => {
  const results = [];
  
  for (let i = 0; i < platforms.length; i++) {
    const platform = platforms[i];
    const metrics = await collectAllMetrics(platform);
    
    results.push({
      platformId: platform.id,
      timestamp: Date.now(),
      ...metrics
    });
    
    if (onProgress) {
      onProgress(platform.id, i + 1, platforms.length);
    }
  }
  
  return results;
};
