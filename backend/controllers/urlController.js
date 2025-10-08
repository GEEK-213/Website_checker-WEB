const supabase = require('../supabaseClient');
const csv = require('fast-csv');
const { Readable } = require('stream');
const { checkWebsite } = require('../pupputeer/WebsiteCheck');

// --- URL Management ---

exports.getUrls = async (req, res) => {
  try {
    // ONLY get URLs for the currently logged-in user
    const { data, error } = await supabase
      .from('urls')
      .select('id, url')
      .eq('user_id', req.user.id); // Use the user ID from the middleware

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

    const { error: deleteError } = await supabase.from('urls').delete().eq('user_id', req.user.id);
    if (deleteError) throw deleteError;

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

// --- CSV Functionality ---

exports.exportUrls = async (req, res) => {
    try {
        // ONLY get URLs for the currently logged-in user
        const { data, error } = await supabase.from('urls').select('url').eq('user_id', req.user.id);
        if (error) throw error;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="urls.csv"');

        const csvStream = csv.format({ headers: true });
        csvStream.pipe(res);
        data.forEach(row => csvStream.write(row));
        csvStream.end();
    } catch (err) {
        console.error("Error in exportUrls:", err);
        res.status(500).json({ error: 'Failed to export URLs.' });
    }
};

exports.importUrls = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded.' });
        }
        const urlsToInsert = [];
        const stream = Readable.from(req.file.buffer.toString());

        stream.pipe(csv.parse({ headers: false }))
            .on('error', error => { throw error; })
            // Add the user_id to each URL from the CSV
            .on('data', row => urlsToInsert.push({ url: row[0], user_id: req.user.id }))
            .on('end', async () => {
                try {
                    if (urlsToInsert.length > 0) {
                        const { data, error } = await supabase.from('urls').insert(urlsToInsert);
                        if (error) throw error;
                        res.status(201).json({ message: 'URLs imported successfully.', count: urlsToInsert.length });
                    } else {
                        res.status(200).json({ message: 'No URLs found in CSV.' });
                    }
                } catch (innerErr) {
                    console.error("Error in importUrls .on('end'):", innerErr);
                    res.status(500).json({ error: 'Failed to import URLs to database.' });
                }
            });
    } catch (err) {
        console.error("Error in importUrls:", err);
        res.status(500).json({ error: 'Failed to import URLs.' });
    }
};




exports.checkSoloWebsite = async (req, res) => {
  
  try {
      const { url, url_id } = req.body;
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

exports.runAllChecks = async (req, res) => {

  try {
      const { data: urls, error: fetchError } = await supabase.from('urls').select('id, url').eq('user_id', req.user.id);
      if (fetchError) throw fetchError;

      const results = [];
      for (const item of urls) {
          const result = await checkWebsite(item);
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
      } else {
          res.status(200).json({ message: 'No websites to check.' });
      }
  } catch (err) {
      console.error('Error running all checks:', err);
      res.status(500).json({ error: 'Failed to run all website checks.' });
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