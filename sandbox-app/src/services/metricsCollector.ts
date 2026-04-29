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

// Performance metrics collection using Performance API
export const collectPerformanceMetrics = async (
  platform: Platform
): Promise<PerformanceMetrics | null> => {
  try {
    const url = getPlatformUrl(platform);
    const startTime = performance.now();
    
    // Create a hidden iframe to load the platform
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        document.body.removeChild(iframe);
        resolve(null);
      }, 30000); // 30 second timeout
      
      iframe.onload = () => {
        clearTimeout(timeout);
        const loadTime = performance.now() - startTime;
        
        try {
          // Try to get performance metrics from iframe if same-origin
          const iframePerf = iframe.contentWindow?.performance;
          
          if (iframePerf) {
            const navigation = iframePerf.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
            const paint = iframePerf.getEntriesByType('paint');
            
            const fcp = paint.find(p => p.name === 'first-contentful-paint');
            const memory = (performance as any).memory;
            
            const metrics: PerformanceMetrics = {
              fcp: fcp?.startTime,
              loadTime: loadTime,
              domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.domContentLoadedEventStart || 0,
              memoryUsage: memory ? memory.usedJSHeapSize : undefined
            };
            
            document.body.removeChild(iframe);
            resolve(metrics);
          } else {
            // Cross-origin, just return basic load time
            const metrics: PerformanceMetrics = {
              loadTime: loadTime,
              domContentLoaded: 0
            };
            
            document.body.removeChild(iframe);
            resolve(metrics);
          }
        } catch (error) {
          console.warn('Could not access iframe performance:', error);
          const metrics: PerformanceMetrics = {
            loadTime: loadTime,
            domContentLoaded: 0
          };
          
          document.body.removeChild(iframe);
          resolve(metrics);
        }
      };
      
      iframe.onerror = () => {
        clearTimeout(timeout);
        document.body.removeChild(iframe);
        resolve(null);
      };
      
      iframe.src = url;
    });
  } catch (error) {
    console.error(`Failed to collect performance metrics for ${platform.name}:`, error);
    return null;
  }
};

// Availability/Health check
export const collectAvailabilityMetrics = async (
  platform: Platform
): Promise<AvailabilityMetrics> => {
  const startTime = performance.now();
  
  try {
    const baseUrl = getPlatformUrl(platform);
    // Use health check if available, otherwise check main URL
    const url = platform.healthCheck ? `${baseUrl}${platform.healthCheck}` : baseUrl;
    
    const response = await fetch(url, {
      method: 'GET',
      mode: 'no-cors', // Use no-cors for external URLs to avoid CORS issues
      cache: 'no-cache'
    });
    
    const responseTime = performance.now() - startTime;
    
    // For no-cors mode, response.ok might not work, so check type
    const isOnline = response.type === 'opaque' || response.ok;
    
    return {
      status: isOnline ? 'online' : 'offline',
      httpStatus: response.status || 200, // opaque responses have status 0
      responseTime: Math.round(responseTime),
      uptime: isOnline ? 100 : 0,
      lastCheck: Date.now()
    };
  } catch (error) {
    const responseTime = performance.now() - startTime;
    
    return {
      status: 'offline',
      responseTime: Math.round(responseTime),
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
