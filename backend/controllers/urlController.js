const supabase = require('../supabaseClient');
const csv = require('fast-csv');
const { Readable } = require('stream');
const { checkWebsite } = require('../pupputeer/WebsiteCheck');

// --- URL Management ---

exports.getUrls = async (req, res) => {
  try {
    const { data, error } = await supabase.from('urls').select('id, url');
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

    const { error: deleteError } = await supabase.from('urls').delete().neq('id', 0);
    if (deleteError) throw deleteError;

    if (urls.length === 0) {
        return res.status(200).json({ message: "All URLs cleared successfully." });
    }

    const { data, error } = await supabase.from('urls').insert(urls.map(url => ({ url })));
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
        const { data, error } = await supabase.from('urls').select('url');
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
            .on('data', row => urlsToInsert.push({ url: row[0] }))
            .on('end', async () => {
                try {
                    if (urlsToInsert.length > 0) {
                        const { data, error } = await supabase.from('urls').insert(urlsToInsert);
                        if (error) throw error;
                        res.status(201).json({ message: 'URLs imported successfully.', count: data ? data.length : 0 });
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

// --- Website Checking Logic ---

exports.checkSoloWebsite = async (req, res) => {
    try {
        const { url, url_id } = req.body;
        if (!url || !url_id) {
            return res.status(400).json({ error: 'URL and URL ID are required.' });
        }
        
        const result = await checkWebsite({ id: url_id, url: url });
        
        const { data, error } = await supabase.from('check_results').insert([{
            url_id: result.originalUrl.id,
            url: result.originalUrl.url, // Always use the original URL
            status: result.status,
            error_log: result.error_log,
            screenshot: result.screenshot
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
        const { data: urls, error: fetchError } = await supabase.from('urls').select('id, url');
        if (fetchError) throw fetchError;

        const allCheckPromises = urls.map(item => checkWebsite(item));
        const results = await Promise.all(allCheckPromises);

        const resultsToInsert = results.map(result => {
            return {
                url_id: result.originalUrl.id,
                url: result.originalUrl.url, // Always use the original URL
                status: result.status,
                error_log: result.error_log,
                screenshot: result.screenshot,
            };
        });

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
        const { data, error } = await supabase.rpc('get_latest_check_results');
        if (error) throw error;
        res.status(200).json(data);
    } catch (err) {
        console.error("Error in getLatestResults:", err);
        res.status(500).json({ error: 'Failed to fetch latest results.' });
    }
};


// exports.getResultsByDate = async (req, res) => {
//     try {
//         const { date } = req.params; // date format: YYYY-MM-DD
//         const startDate = new Date(`${date}T00:00:00.000Z`);
//         const endDate = new Date(`${date}T23:59:59.999Z`);

//         const { data, error } = await supabase
//             .from('check_results')
//             .select('*')
//             .gte('created_at', startDate.toISOString())
//             .lte('created_at', endDate.toISOString())
//             .order('created_at', { ascending: false });

//         if (error) throw error;
//         res.status(200).json(data);
//     } catch (err) {
//         console.error("Error in getResultsByDate:", err);
//         res.status(500).json({ error: 'Failed to fetch results for the specified date.' });
//     }
// };

