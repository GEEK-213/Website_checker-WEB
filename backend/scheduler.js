// require('dotenv').config();
// const cron = require('node-cron');
// const csv = require('fast-csv');
// const supabase = require('./supabaseClient');
// const { checkWebsite } = require('./pupputeer/WebsiteCheck');
// const { sendEmail } = require('./services/emailServices');

// const runDailyChecksAndSendReport = async () => {
//     console.log('🚀 Starting daily website check process...');

//     try {
//         const { data: urls, error: fetchError } = await supabase.from('urls').select('id, url');
//         if (fetchError) throw fetchError;
//         if (!urls || urls.length === 0) {
//             console.log('No URLs to check. Skipping...');
//             return;
//         }

//         console.log(`Found ${urls.length} URLs to check.`);

//         // FIX: Pass the entire url object {id, url} to the checkWebsite function.
//         const allCheckPromises = urls.map(item => checkWebsite(item));
//         const results = await Promise.all(allCheckPromises);

//         // FIX: Use the originalUrl object returned from the checkWebsite function.
//         const resultsToInsert = results.map(result => ({
//             url_id: result.originalUrl.id,
//             url: result.originalUrl.url,
//             status: result.status,
//             error_log: result.error_log,
//             screenshot: result.screenshot, // We now save the screenshot URL here too
//         }));

//         if (resultsToInsert.length > 0) {
//             const { error: insertError } = await supabase.from('check_results').insert(resultsToInsert);
//             if (insertError) throw insertError;
//         }

//         console.log('Successfully saved new check results to the database.');

//         // Format a slightly different object for the CSV to avoid including the large originalUrl object
//         const csvResults = results.map(r => ({
//             url: r.originalUrl.url,
//             status: r.status,
//             error_log: r.error_log,
//             screenshot_url: r.screenshot
//         }));
//         const csvString = await csv.writeToString(csvResults, { headers: true });
        
//         const today = new Date();
//         const dateString = today.toISOString().split('T')[0];
//         const frontendUrl = 'http://localhost:5173'; // Replace with deployed URL in production
//         const logPageUrl = `${frontendUrl}/logs/${dateString}`;
        
//         const mailOptions = {
//             to: process.env.EMAIL_TO,
//             subject: `Website Status Report - ${today.toLocaleDateString()}`,
//             text: `Attached is the daily website status report.\n\nChecked ${results.length} websites.\n\nView the full report with screenshots here: ${logPageUrl}`,
//             attachments: [{
//                 filename: `website_report_${dateString}.csv`,
//                 content: csvString,
//                 contentType: 'text/csv',
//             }],
//         };
        
//         await sendEmail(mailOptions.to, mailOptions.subject, mailOptions.text, mailOptions.attachments);

//     } catch (error) {
//         console.error('❌ An error occurred during the daily check process:', error);
//     } finally {
//         console.log('Daily check process finished.');
//     }
// };

// cron.schedule('* * * * *', () => {
//     console.log('-------------------------------------');
//     console.log('Triggering scheduled job: Daily Website Checks');
//     runDailyChecksAndSendReport();
// }, {
//     scheduled: true,
//     timezone: "Asia/Kolkata"
// });

// console.log('✅ Scheduler is running. Waiting for the next scheduled job at current time...');