const puppeteer = require("puppeteer");
const { TimeoutError } = require("puppeteer");
const supabase = require("../supabaseClient");

// List of keywords to detect for adult/inappropriate content
const inappropriateKeywords = [
  "adult", "18+", "gambling", "casino", "betting", "poker", "viagra", "cialis",
  "nsfw", "explicit", "erotic", "porn", "sex", "escort",
];

async function checkWebsite(urlObject) {
  let browser = null;
  const { url } = urlObject;
  const redirectChain = [];

  try {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: "/usr/bin/chromium",
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage","--single-process"],
      ignoreHTTPSErrors: true,
    });
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    );
    await page.setViewport({ width: 1280, height: 800 });

    page.on("request", (request) => {
      if (request.isNavigationRequest()) {
        redirectChain.push(request.url());
      }
    });

    const response = await page.goto(url, {
      waitUntil: "networkidle2", 
      timeout: 30000,
    });

    let status = "good";
    let error_log = null;
    let publicUrl = null;

    const securityDetails = response.securityDetails();
    if (
      securityDetails &&
      typeof securityDetails.valid === "function" &&
      !securityDetails.valid()
    ) {
      status = "ssl_error";
      error_log = `Invalid SSL certificate for ${securityDetails.subjectName()}.`;
    } else if (response.status() >= 400) {
      status = "http_error";
      error_log = `Site returned HTTP status ${response.status()}.`;
    } else if (redirectChain.length > 2) {
      status = "many_redirects";
      error_log = `Detected ${redirectChain.length - 1} redirects.`;
    } else {
      const pageContent = await page.content();
      const pageText = await page.evaluate(() => document.body.innerText);

      if (
        pageContent.match(
          /database connection error|SQLSTATE|mysql_connect_error/i
        )
      ) {
        status = "db_error";
        error_log = "Detected database error message on the page.";
      } else {
        const foundKeyword = inappropriateKeywords.find((keyword) =>
          pageText.toLowerCase().includes(keyword)
        );
        if (foundKeyword) {
          status = "adult_content";
          error_log = `Potential adult content detected (keyword: "${foundKeyword}").`;
        }
      }
    }

    const screenshotBuffer = await page.screenshot();

    if (screenshotBuffer) {
      const fileName = `${Date.now()}-${url.replace(/[^a-zA-Z0-9]/g, "_")}.png`;
      const { error: uploadError } = await supabase.storage
        .from("screenshots")
        .upload(fileName, screenshotBuffer, {
          contentType: "image/png",
          upsert: true,
        });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage
        .from("screenshots")
        .getPublicUrl(fileName);
      publicUrl = data.publicUrl;
    }

    return {
      originalUrl: urlObject,
      url,
      status,
      screenshot: publicUrl,
      error_log,
    };
  } catch (error) {
    let status = "error";
    let error_log = error.message;

    if (error instanceof TimeoutError) {
      status = "timeout_error";
      error_log = `Site did not load within 60 seconds.`;
    } else if (error.message.includes("net::ERR_NAME_NOT_RESOLVED")) {
      status = "dns_error";
      error_log = "Site does not open (DNS could not be resolved).";
    } else if (error.message.includes("net::ERR_CERT")) {
      status = "ssl_error";
      error_log = "A critical SSL certificate error occurred.";
    }

    return { originalUrl: urlObject, url, status: "error", screenshot: null, error_log: error.message };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = { checkWebsite };