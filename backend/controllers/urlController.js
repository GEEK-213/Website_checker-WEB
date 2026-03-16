const supabase = require('../supabaseClient');
const csv = require('fast-csv');
const { Readable } = require('stream');
const puppeteer = require("puppeteer");
const { checkWebsite } = require('../puppeteer/WebsiteCheck');

// Simple built-in semaphore for parallel execution
const createLimit = (concurrency) => {
    let active = 0;
    const queue = [];

    const next = () => {
        if (queue.length > 0 && active < concurrency) {
            active++;
            const { fn, resolve, reject } = queue.shift();
            fn().then(resolve).catch(reject).finally(() => {
                active--;
                next();
            });
        }
    };

    return (fn) => new Promise((resolve, reject) => {
        queue.push({ fn, resolve, reject });
        next();
    });
};

// --- URL Management ---
exports.getUrls = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('urls')
      .select('id, url')
      .eq('user_id', req.user.id);
    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    console.error("Error in getUrls:", err);
    res.status(500).json({ error: "Failed to retrieve URLs." });
  }
};

exports.saveUrls = async (req, res) => {
  console.log(">>> saveUrls called for user:", req.user?.id);
  console.log(">>> saveUrls body:", JSON.stringify(req.body));
  try {
    const { urls } = req.body;
    if (!urls || !Array.isArray(urls)) {
      console.log(">>> saveUrls: Invalid input (not an array)");
      return res.status(400).json({ error: "Invalid input: 'urls' must be an array." });
    }
    // Delete existing URLs for this user and replace with new list
    await supabase.from('urls').delete().eq('user_id', req.user.id);
    if (urls.length === 0) {
      return res.status(200).json({ message: "All of this user's URLs were cleared." });
    }
    const urlsToInsert = urls.map(url => ({
      url: url.url,
      user_id: req.user.id
    }));
    const { data, error } = await supabase.from('urls').insert(urlsToInsert).select();
    if (error) {
        console.error(">>> Supabase Insert Error:", error);
        throw error;
    }
    res.status(201).json({ message: "URLs saved successfully.", count: data ? data.length : 0 });
  } catch (err) {
    console.error(">>> Error in saveUrls:", err);
    res.status(500).json({ error: "Failed to save URLs: " + err.message });
  }
};

// --- CSV Functionality ---
exports.exportUrls = async (req, res) => {
  try {
    const { data, error } = await supabase.from('urls').select('url').eq('user_id', req.user.id);
    if (error) throw error;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=urls.csv');
    
    const csvStream = csv.format({ headers: true });
    csvStream.pipe(res);
    data.forEach(row => csvStream.write(row));
    csvStream.end();
  } catch (err) {
    console.error("Error in exportUrls:", err);
    res.status(500).json({ error: "Failed to export URLs." });
  }
};

exports.importUrls = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded." });
    
    const urls = [];
    const stream = Readable.from(req.file.buffer);
    
    csv.parseStream(stream, { headers: true })
      .on('data', (row) => {
        if (row.url) urls.push({ url: row.url, user_id: req.user.id });
      })
      .on('end', async () => {
        if (urls.length > 0) {
          const { error } = await supabase.from('urls').insert(urls);
          if (error) return res.status(500).json({ error: "Failed to import URLs." });
        }
        res.status(201).json({ message: "URLs imported successfully.", count: urls.length });
      });
  } catch (err) {
    console.error("Error in importUrls:", err);
    res.status(500).json({ error: "Failed to import URLs." });
  }
};

// --- Website Checking Logic ---

exports.checkSoloWebsite = async (req, res) => {
  try {
    const { url, url_id } = req.body;
    console.log(">>> INVOKING SOLO CHECK for:", url);
    const result = await checkWebsite({ id: url_id, url: url });
    
    const { data, error } = await supabase.from('check_results').insert([{
      url_id: result.originalUrl.id,
      url: result.originalUrl.url,
      status: result.status,
      error_log: result.error_log,
      screenshot: result.screenshot,
      load_time: result.load_time,
      security_details: result.security_details,
      user_id: req.user.id
    }]).select();

    if (error) throw error;
    res.status(201).json({ message: `Check complete for ${url}`, result: data[0] });
  } catch (err) {
    console.error('Error in solo check:', err);
    res.status(500).json({ error: 'Failed to perform website check.' });
  }
};

// --- RUN ALL CHECKS (PARALLEL) ---
exports.runAllChecks = async (req, res) => {
  console.log(">>> INVOKING GLOBAL SCAN for user:", req.user.id);
  let browser = null;
  const limit = createLimit(5); 

  try {
    const { data: urls, error: fetchError } = await supabase.from('urls').select('id, url').eq('user_id', req.user.id);
    if (fetchError) throw fetchError;

    if (!urls || urls.length === 0) {
        return res.status(200).json({ message: 'No websites to check.' });
    }

    console.log(">>> Launching browser...");
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
      ignoreHTTPSErrors: true,
    });

    console.log(">>> Browser launched successfully.");

    const checkTasks = urls.map(item => limit(async () => {
      console.log(`>>> Starting check for ${item.url}...`);
      const result = await checkWebsite(item, browser);
      console.log(`>>> Finished check for ${item.url}. Status: ${result.status}`);
      return result;
    }));

    console.log(">>> Waiting for all tasks to complete...");
    const results = await Promise.all(checkTasks);
    console.log(">>> All tasks completed. Total results:", results.length);

    const resultsToInsert = results.map(result => ({
        url_id: result.originalUrl.id,
        url: result.originalUrl.url,
        status: result.status,
        error_log: result.error_log,
        screenshot: result.screenshot,
        load_time: result.load_time,
        security_details: result.security_details,
        user_id: req.user.id
    }));

    if (resultsToInsert.length > 0) {
        console.log(">>> Inserting results into database...");
        const { data, error: insertError } = await supabase.from('check_results').insert(resultsToInsert).select();
        if (insertError) throw insertError;
        return res.status(201).json({ message: 'All checks completed.', results: data });
    } else {
        return res.status(200).json({ message: 'All checks skipped.' });
    }
  } catch (err) {
    console.error('>>> FATAL_SCAN_ERROR:', err);
    return res.status(500).json({ error: 'SCAN_FAILURE: ' + err.message });
  } finally {
    if (browser) {
      console.log(">>> Closing browser...");
      await browser.close();
    }
  }
};

exports.getLatestResults = async (req, res) => {
  try {
    const { data, error } = await supabase.rpc('get_latest_check_results_for_user', { p_user_id: req.user.id });
    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    console.error("Error in getLatestResults:", err);
    res.status(500).json({ error: 'Failed to fetch latest results.' });
  }
};
