const supabase = require('../supabaseClient');
const csv = require('fast-csv');
const { Readable } = require('stream');
const puppeteer = require("puppeteer"); // Import puppeteer here
const { checkWebsite } = require('../pupputeer/WebsiteCheck');

// --- URL Management --- (No changes below)
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
  try {
    const { urls } = req.body;
    if (!urls || !Array.isArray(urls)) {
      return res.status(400).json({ error: "Invalid input: 'urls' must be an array." });
    }
    await supabase.from('urls').delete().eq('user_id', req.user.id);
    if (urls.length === 0) {
      return res.status(200).json({ message: "All of this user's URLs were cleared." });
    }
    const urlsToInsert = urls.map(url => ({
      url: url.url,
      user_id: req.user.id
    }));
    const { data, error } = await supabase.from('urls').insert(urlsToInsert).select();
    if (error) throw error;
    res.status(201).json({ message: "URLs saved successfully.", count: data ? data.length : 0 });
  } catch (err) {
    console.error("Error in saveUrls:", err);
    res.status(500).json({ error: "Failed to save URLs." });
  }
};

// --- CSV Functionality --- (No changes below)
exports.exportUrls = async (req, res) => { /* ... no changes ... */ };
exports.importUrls = async (req, res) => { /* ... no changes ... */ };

// --- Website Checking Logic ---

exports.checkSoloWebsite = async (req, res) => {
  try {
    const { url, url_id } = req.body;
    // For a solo check, we don't pass a browser, so checkWebsite launches its own
    const result = await checkWebsite({ id: url_id, url: url });
    
    const { data, error } = await supabase.from('check_results').insert([{
      url_id: result.originalUrl.id,
      url: result.originalUrl.url,
      status: result.status,
      error_log: result.error_log,
      screenshot: result.screenshot,
      user_id: req.user.id
    }]).select();

    if (error) throw error;
    res.status(201).json({ message: `Check complete for ${url}`, result: data[0] });
  } catch (err) {
    console.error('Error in solo check:', err);
    res.status(500).json({ error: 'Failed to perform website check.' });
  }
};

// --- THIS IS THE UPDATED FUNCTION ---
exports.runAllChecks = async (req, res) => {
  let browser = null; // Define browser here to access it in the 'finally' block
  try {
    const { data: urls, error: fetchError } = await supabase.from('urls').select('id, url').eq('user_id', req.user.id);
    if (fetchError) throw fetchError;

    if (!urls || urls.length === 0) {
        return res.status(200).json({ message: 'No websites to check.' });
    }

   
    browser = await puppeteer.launch({
      headless: true,
      executablePath: "/usr/bin/chromium",
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--single-process"],
    });

    const results = [];
 
    for (const item of urls) {
      console.log(`Checking ${item.url}...`);
      const result = await checkWebsite(item, browser); // Pass the browser instance
      results.push(result);
    }

    const resultsToInsert = results.map(result => ({
        url_id: result.originalUrl.id,
        url: result.originalUrl.url,
        status: result.status,
        error_log: result.error_log,
        screenshot: result.screenshot,
        user_id: req.user.id
    }));

    if (resultsToInsert.length > 0) {
        const { data, error: insertError } = await supabase.from('check_results').insert(resultsToInsert).select();
        if (insertError) throw insertError;
        res.status(201).json({ message: 'All checks completed.', results: data });
    }
  } catch (err) {
    console.error('Error running all checks:', err);
    res.status(500).json({ error: 'Failed to run all website checks.' });
  } finally {
 
    if (browser) {
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