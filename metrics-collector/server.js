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
    
    // Helper to extract audit details
    const getAuditDetails = (auditId) => {
      const audit = lhr.audits[auditId];
      if (!audit) return null;
      return {
        score: audit.score,
        numericValue: audit.numericValue,
        displayValue: audit.displayValue,
        title: audit.title,
        description: audit.description
      };
    };

    // Get failed audits for each category
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
            description: audit.description,
            score: audit.score,
            displayValue: audit.displayValue
          };
        })
        .slice(0, 10); // Top 10 issues
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

app.listen(PORT, () => {
  console.log(`Metrics Collector API running on http://localhost:${PORT}`);
  console.log(`Lighthouse endpoint: http://localhost:${PORT}/api/lighthouse?url=<target-url>`);
  console.log(`Docker management: http://localhost:${PORT}/api/docker/*`);
});
