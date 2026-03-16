const puppeteer = require("puppeteer");
const { TimeoutError } = require("puppeteer");
const supabase = require("../supabaseClient");
const dns = require("dns").promises;

const inappropriateKeywords = [
  "adult", "18+", "gambling", "casino", "betting", "poker", "viagra", "cialis",
  "nsfw", "explicit", "erotic", "porn", "sex", "escort",
];

/**
 * Perform forensic DNS lookup with improved reliability
 */
async function getDnsForensics(hostname) {
  console.log(`>>> Forensic DNS Audit: ${hostname}`);
  try {
    // dns.lookup is more compatible with diverse OS configurations for A records
    const lookup = await dns.lookup(hostname, { all: true }).catch(() => []);
    const a = Array.isArray(lookup) ? lookup.map(l => l.address) : [lookup.address];

    const [mx, txt] = await Promise.all([
      dns.resolveMx(hostname).catch(() => []),
      dns.resolveTxt(hostname).catch(() => []),
    ]);
    
    console.log(`>>> DNS Audit Complete for ${hostname}. A:${a.length}, MX:${mx.length}, TXT:${txt.length}`);
    return { a: a.filter(Boolean), mx, txt };
  } catch (err) {
    console.error(`>>> DNS Audit Failure: ${err.message}`);
    return { a: [], mx: [], txt: [] };
  }
}

/**
 * Algorithmically determine security posture with case-insensitive verification
 */
function calculateSecurityScore(headers, sslValid) {
  let score = sslValid ? 25 : 0;
  
  // Normalize headers to lowercase for reliable matching
  const lowerHeaders = {};
  Object.keys(headers).forEach(k => {
    lowerHeaders[k.toLowerCase()] = headers[k];
  });

  const securityHeaders = {
    'strict-transport-security': 20,
    'content-security-policy': 25,
    'x-frame-options': 15,
    'x-content-type-options': 10,
    'permissions-policy': 5
  };

  const foundHeaders = [];
  Object.keys(securityHeaders).forEach(h => {
    if (lowerHeaders[h]) {
      score += securityHeaders[h];
      foundHeaders.push(h);
    }
  });

  let grade = 'F';
  if (score >= 90) grade = 'A+';
  else if (score >= 80) grade = 'A';
  else if (score >= 70) grade = 'B';
  else if (score >= 50) grade = 'C';
  else if (score >= 30) grade = 'D';

  return { score, grade, foundHeaders };
}

async function checkWebsite(urlObject, browser) {
  let page;
  let browserToUse = browser;
  let browserLaunchedInternally = false;
  const { url } = urlObject;
  let hostname;
  try {
    hostname = new URL(url).hostname;
  } catch (e) {
    hostname = url;
  }
  
  const redirectChain = [];
  let securityDetailsOutput = {};

  console.log(`>>> Starting Internal Audit for: ${url}`);

  try {
    if (!browserToUse) {
      console.log(">>> Launching internal browser instance...");
      browserToUse = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
        ignoreHTTPSErrors: true,
      });
      browserLaunchedInternally = true;
    }

    page = await browserToUse.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    await page.setViewport({ width: 1440, height: 900 });

    page.on("request", (request) => {
      if (request.isNavigationRequest()) redirectChain.push(request.url());
    });

    const startTime = Date.now();
    const response = await page.goto(url, { waitUntil: "networkidle2", timeout: 50000 });
    const loadTime = Date.now() - startTime;

    const headers = response.headers();
    const sslDetails = response.securityDetails();
    
    console.log(`>>> Page loaded. Status: ${response.status()}, SSL: ${!!sslDetails}, Headers keys: ${Object.keys(headers).length}`);
    
    const dnsInfo = await getDnsForensics(hostname);
    
    // Security Audit
    const sslValid = !!sslDetails;
    const audit = calculateSecurityScore(headers, sslValid);

    console.log(`>>> Security Score: ${audit.score}, Grade: ${audit.grade}, Found Headers: [${audit.foundHeaders.join(', ')}]`);

    securityDetailsOutput = {
      audit,
      dns: dnsInfo,
      server: headers['server'] || headers['Server'] || 'Cloud Edge (Protected)',
      ssl: sslDetails ? {
        issuer: sslDetails.issuer(),
        validFrom: sslDetails.validFrom(),
        validTo: sslDetails.validTo(),
        protocol: sslDetails.protocol()
      } : null
    };

    let status = "good";
    let error_log = null;

    if (sslValid && sslDetails.validTo() * 1000 < Date.now()) {
        status = "ssl_error";
        error_log = "SSL certificate has expired.";
    } else if (response.status() >= 400) {
      status = "http_error";
      error_log = `Site returned HTTP status ${response.status()}.`;
    } else if (redirectChain.length > 5) {
      status = "many_redirects";
      error_log = `Excessive redirects detected (${redirectChain.length - 1}).`;
    } else {
      const pageText = await page.evaluate(() => document.body.innerText);
      const foundKeyword = inappropriateKeywords.find((keyword) => pageText.toLowerCase().includes(keyword));
      if (foundKeyword) {
          status = "adult_content";
          error_log = `Compliance Alert: Adult content found (keyword: "${foundKeyword}").`;
      }
    }

    const screenshotBuffer = await page.screenshot({ fullPage: false });
    let publicUrl = null;

    if (screenshotBuffer) {
      const fileName = `audit_${Date.now()}_${hostname.replace(/\./g, '_')}.png`;
      const { error: uploadError } = await supabase.storage.from("screenshots").upload(fileName, screenshotBuffer, { contentType: "image/png" });
      if (!uploadError) {
        const { data } = supabase.storage.from("screenshots").getPublicUrl(fileName);
        publicUrl = data.publicUrl;
      }
    }

    console.log(`>>> Audit Successful for ${url}. Status: ${status}, DNS A: ${dnsInfo.a.length}, MX: ${dnsInfo.mx.length}`);

    return {
      originalUrl: urlObject,
      url,
      status,
      screenshot: publicUrl,
      error_log,
      load_time: loadTime,
      security_details: securityDetailsOutput
    };

  } catch (error) {
    console.error(`>>> AUDIT_EXCEPTION for ${url}: ${error.message}`);
    console.error(error.stack);
    let status = "error";
    let error_log = error.message;

    if (error instanceof TimeoutError || error.name === 'TimeoutError') {
      status = "timeout_error";
      error_log = `System timed out after 50s.`;
    }

    return { 
      originalUrl: urlObject, 
      url: url, 
      status: status, 
      screenshot: null, 
      error_log: error_log,
      load_time: null,
      security_details: { 
          audit: { grade: 'F', score: 0, foundHeaders: [] },
          dns: { a: [], mx: [], txt: [] },
          error: "System was unable to establish a secure connection for deep audit." 
      }
    };
  } finally {
    try { if (page) await page.close(); } catch(e) {}
    try { if (browserLaunchedInternally && browserToUse) await browserToUse.close(); } catch(e) {}
  }
}

module.exports = { checkWebsite };