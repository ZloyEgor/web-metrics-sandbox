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

// Debug: try to launch Chrome and immediately kill it. Used to diagnose
// whether Chromium can run in the deployment environment at all.
app.get('/api/debug/chrome', async (req, res) => {
  let chrome;
  const t0 = Date.now();
  try {
    chrome = await chromeLauncher.launch({
      chromePath: process.env.CHROME_PATH || undefined,
      chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
    });
    res.json({ ok: true, port: chrome.port, launchMs: Date.now() - t0 });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message, launchMs: Date.now() - t0 });
  } finally {
    if (chrome) await chrome.kill().catch(() => {});
  }
});

// Lighthouse metrics endpoint.
// Streams keep-alive whitespace while Lighthouse runs so intermediate
// proxies (e.g. Yandex Serverless Containers' frontend) don't drop the
// connection due to idle timeout, then writes the JSON payload on a
// final line. Clients can JSON.parse(text.trim().split('\n').pop()).
app.get('/api/lighthouse', async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  let chrome;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  // Disable nginx-style buffering on intermediate proxies.
  res.setHeader('X-Accel-Buffering', 'no');

  // Periodically write a single space + newline as a keep-alive heartbeat
  // until Lighthouse finishes. JSON.parse will choke on these, so the
  // client must take the LAST non-empty line.
  const heartbeat = setInterval(() => {
    if (!res.writableEnded) res.write(' \n');
  }, 5000);

  try {
    console.log(`Running Lighthouse for ${url}...`);

    chrome = await chromeLauncher.launch({
      chromePath: process.env.CHROME_PATH || undefined,
      chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
    });

    // Tightened settings for serverless environments where the default
    // 45s networkidle wait often never resolves. We cap each phase, drop
    // screenshots/full-page-screenshot which inflate response size and
    // sometimes hang, and skip a few audits that need real network I/O.
    const flags = {
      logLevel: 'error',
      output: 'json',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      port: chrome.port,
      maxWaitForFcp: 15000,
      maxWaitForLoad: 30000,
      disableFullPageScreenshot: true,
      skipAudits: ['screenshot-thumbnails', 'final-screenshot', 'full-page-screenshot']
    };

    const runnerResult = await lighthouse(url, flags);
    
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

    const payload = {
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
    };

    clearInterval(heartbeat);
    res.write('\n' + JSON.stringify(payload) + '\n');
    res.end();
  } catch (error) {
    console.error('Lighthouse error:', error);
    clearInterval(heartbeat);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to run Lighthouse', message: error.message });
    } else {
      res.write('\n' + JSON.stringify({ error: 'Failed to run Lighthouse', message: error.message }) + '\n');
      res.end();
    }
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
