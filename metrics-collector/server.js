import express from 'express';
import cors from 'cors';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Lighthouse metrics endpoint
app.get('/api/lighthouse', async (req, res) => {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }
  
  let chrome;
  
  try {
    console.log(`Running Lighthouse for ${url}...`);
    
    // Launch Chrome
    chrome = await chromeLauncher.launch({
      chromePath: process.env.CHROME_PATH || undefined,
      chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
    });
    
    // Run Lighthouse
    const options = {
      logLevel: 'info',
      output: 'json',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo', 'pwa'],
      port: chrome.port
    };
    
    const runnerResult = await lighthouse(url, options);
    
    // Extract the results
    const { lhr } = runnerResult;
    
    // Helper to extract audit details (compact: skip long description text
    // so the JSON fits the 3.5MB Yandex Serverless Containers response cap).
    const getAuditDetails = (auditId) => {
      const audit = lhr.audits[auditId];
      if (!audit) return null;
      return {
        score: audit.score,
        numericValue: audit.numericValue,
        displayValue: audit.displayValue,
        title: audit.title
      };
    };

    // Get failed audits for each category (compact summary)
    const getFailedAudits = (categoryId) => {
      const category = lhr.categories[categoryId];
      if (!category) return [];

      return category.auditRefs
        .filter(ref => {
          const audit = lhr.audits[ref.id];
          return audit && (audit.score === null || audit.score < 1);
        })
        .map(ref => {
          const audit = lhr.audits[ref.id];
          return {
            id: ref.id,
            title: audit.title,
            score: audit.score,
            displayValue: audit.displayValue
          };
        })
        .slice(0, 10);
    };

    res.json({
      url: lhr.finalUrl,
      fetchTime: lhr.fetchTime,
      categories: {
        performance: {
          score: lhr.categories.performance?.score || 0,
          title: lhr.categories.performance?.title
        },
        accessibility: {
          score: lhr.categories.accessibility?.score || 0,
          title: lhr.categories.accessibility?.title
        },
        'best-practices': {
          score: lhr.categories['best-practices']?.score || 0,
          title: lhr.categories['best-practices']?.title
        },
        seo: {
          score: lhr.categories.seo?.score || 0,
          title: lhr.categories.seo?.title
        },
        pwa: lhr.categories.pwa ? {
          score: lhr.categories.pwa.score,
          title: lhr.categories.pwa.title
        } : null
      },
      audits: {
        // Performance metrics
        'first-contentful-paint': getAuditDetails('first-contentful-paint'),
        'largest-contentful-paint': getAuditDetails('largest-contentful-paint'),
        'total-blocking-time': getAuditDetails('total-blocking-time'),
        'cumulative-layout-shift': getAuditDetails('cumulative-layout-shift'),
        'speed-index': getAuditDetails('speed-index'),
        'time-to-interactive': getAuditDetails('interactive'),
        
        // Additional performance
        'max-potential-fid': getAuditDetails('max-potential-fid'),
        'server-response-time': getAuditDetails('server-response-time'),
      },
      issues: {
        performance: getFailedAudits('performance'),
        accessibility: getFailedAudits('accessibility'),
        'best-practices': getFailedAudits('best-practices'),
        seo: getFailedAudits('seo')
      }
    });
    
  } catch (error) {
    console.error('Lighthouse error:', error);
    res.status(500).json({ 
      error: 'Failed to run Lighthouse',
      message: error.message 
    });
  } finally {
    if (chrome) {
      await chrome.kill();
    }
  }
});

// Docker management endpoints are disabled in containerized deployments.
// They previously shelled out to docker-compose against a sibling directory,
// which is not available inside Serverless Containers.
const dockerDisabled = (req, res) => {
  res.status(503).json({
    error: 'Docker management disabled in deployment',
    message: 'The /api/docker/* endpoints are not available in this build.'
  });
};

app.get('/api/docker/status', dockerDisabled);
app.post('/api/docker/start/:platform', dockerDisabled);
app.post('/api/docker/stop/:platform', dockerDisabled);
app.post('/api/docker/restart/:platform', dockerDisabled);

// Backend-side proxy for cross-origin probes. The browser cannot reach
// http:// targets from an https:// page (mixed content) and cannot read
// timing details across origins. Doing the probe from the backend avoids
// both issues.
const probeUrl = async (url, { method = 'GET', timeoutMs = 15000 } = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();
  try {
    const response = await fetch(url, {
      method,
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        // Some sites (e.g. Jmix) gate non-browser UAs; pretend to be a browser.
        'User-Agent':
          'Mozilla/5.0 (compatible; WebMetricsSandbox/1.0; +https://github.com/ZloyEgor/web-metrics-sandbox)'
      }
    });
    let bytes = 0;
    if (method !== 'HEAD' && response.body) {
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) bytes += value.byteLength;
      }
    }
    return {
      ok: response.ok,
      status: response.status,
      finalUrl: response.url,
      responseTimeMs: Date.now() - startedAt,
      bytes
    };
  } finally {
    clearTimeout(timer);
  }
};

app.get('/api/check/availability', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'URL parameter is required' });
  try {
    const result = await probeUrl(url, { method: 'HEAD', timeoutMs: 10000 });
    res.json({
      status: result.ok ? 'online' : 'offline',
      httpStatus: result.status,
      responseTimeMs: result.responseTimeMs,
      finalUrl: result.finalUrl
    });
  } catch (error) {
    res.json({
      status: 'offline',
      error: error.name === 'AbortError' ? 'timeout' : error.message
    });
  }
});

app.get('/api/check/performance', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'URL parameter is required' });
  try {
    const result = await probeUrl(url, { method: 'GET', timeoutMs: 20000 });
    res.json({
      status: result.ok ? 'online' : 'offline',
      loadTimeMs: result.responseTimeMs,
      bytes: result.bytes,
      httpStatus: result.status,
      finalUrl: result.finalUrl
    });
  } catch (error) {
    res.status(502).json({
      error: error.name === 'AbortError' ? 'timeout' : error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Metrics Collector API running on http://localhost:${PORT}`);
  console.log(`Lighthouse endpoint: http://localhost:${PORT}/api/lighthouse?url=<target-url>`);
  console.log(`Docker management: http://localhost:${PORT}/api/docker/*`);
});
