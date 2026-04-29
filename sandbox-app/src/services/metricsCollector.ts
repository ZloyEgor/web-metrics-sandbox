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

// Performance metrics collection.
// Strategy:
//   1. Try to load the page in a hidden iframe (gives detailed Performance API
//      timings if same-origin). Many target sites block this with
//      X-Frame-Options / CSP frame-ancestors -> onload never fires.
//   2. After a short timeout fall back to a no-cors fetch and just measure
//      the time-to-response so we still produce a sensible loadTime.
const IFRAME_TIMEOUT_MS = 8000;
const FETCH_FALLBACK_TIMEOUT_MS = 15000;

const tryIframePerformance = (url: string): Promise<PerformanceMetrics | null> =>
  new Promise((resolve) => {
    const startTime = performance.now();
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    let settled = false;
    const cleanup = () => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    };

    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(null);
    }, IFRAME_TIMEOUT_MS);

    iframe.onload = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      const loadTime = performance.now() - startTime;

      try {
        const iframePerf = iframe.contentWindow?.performance;
        if (iframePerf) {
          const navigation = iframePerf.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
          const paint = iframePerf.getEntriesByType('paint');
          const fcp = paint.find(p => p.name === 'first-contentful-paint');
          const memory = (performance as any).memory;

          cleanup();
          resolve({
            fcp: fcp?.startTime,
            loadTime,
            domContentLoaded: navigation
              ? navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart
              : 0,
            memoryUsage: memory ? memory.usedJSHeapSize : undefined
          });
          return;
        }
      } catch {
        // Cross-origin iframe access denied; fall through to basic metrics.
      }

      cleanup();
      resolve({ loadTime, domContentLoaded: 0 });
    };

    iframe.onerror = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      cleanup();
      resolve(null);
    };

    iframe.src = url;
  });

const fetchPerformanceFallback = async (url: string): Promise<PerformanceMetrics | null> => {
  const startTime = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_FALLBACK_TIMEOUT_MS);
  try {
    await fetch(url, { mode: 'no-cors', cache: 'no-cache', signal: controller.signal });
    return { loadTime: performance.now() - startTime, domContentLoaded: 0 };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

export const collectPerformanceMetrics = async (
  platform: Platform
): Promise<PerformanceMetrics | null> => {
  try {
    const url = getPlatformUrl(platform);
    const iframeMetrics = await tryIframePerformance(url);
    if (iframeMetrics) return iframeMetrics;
    return await fetchPerformanceFallback(url);
  } catch (error) {
    console.error(`Failed to collect performance metrics for ${platform.name}:`, error);
    return null;
  }
};

// Availability/Health check.
// We try a no-cors fetch first; for sites that block it (e.g. mixed-content
// http redirect from an https origin) we fall back to an <img> ping which
// browsers permit cross-origin.
const AVAILABILITY_TIMEOUT_MS = 10000;

const imagePing = (url: string, timeoutMs: number): Promise<boolean> =>
  new Promise((resolve) => {
    const img = new Image();
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      img.src = '';
      resolve(false);
    }, timeoutMs);
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(ok);
    };
    // Any response (even an HTML page that fails to decode as image)
    // means the host is reachable. Network errors trigger onerror without load.
    img.onload = () => finish(true);
    img.onerror = () => finish(true);
    img.src = url + (url.includes('?') ? '&' : '?') + '_p=' + Date.now();
  });

export const collectAvailabilityMetrics = async (
  platform: Platform
): Promise<AvailabilityMetrics> => {
  const startTime = performance.now();
  const baseUrl = getPlatformUrl(platform);
  const url = platform.healthCheck ? `${baseUrl}${platform.healthCheck}` : baseUrl;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AVAILABILITY_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-cache',
      signal: controller.signal
    });
    const responseTime = performance.now() - startTime;
    const isOnline = response.type === 'opaque' || response.ok;
    if (isOnline) {
      return {
        status: 'online',
        httpStatus: response.status || 200,
        responseTime: Math.round(responseTime),
        uptime: 100,
        lastCheck: Date.now()
      };
    }
  } catch {
    // fall through to image-ping fallback
  } finally {
    clearTimeout(timer);
  }

  const ok = await imagePing(url, AVAILABILITY_TIMEOUT_MS);
  const responseTime = performance.now() - startTime;
  return {
    status: ok ? 'online' : 'offline',
    responseTime: Math.round(responseTime),
    uptime: ok ? 100 : 0,
    lastCheck: Date.now()
  };
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
