// services/reportService.js

const supabase = require('../supabaseClient');
const { sendEmail } = require('./mailService');

/**
 * Generates an HTML report from the check results.
 * @param {Array} results 
 * @returns {string} 
 */
const generateReportHTML = (results) => {
  let rows = results.map(result => `
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;">${result.url}</td>
      <td style="padding: 8px; border: 1px solid #ddd; color: ${result.status === 'good' ? 'green' : 'red'};">${result.status}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${result.error_log || 'N/A'}</td>
      <td style="padding: 8px; border: 1px solid #ddd;"><a href="${result.screenshot}">View</a></td>
    </tr>
  `).join('');

  return `
    <h1>Daily Website Check Report</h1>
    <p>Here are the latest results from your monitored websites.</p>
    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">URL</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Status</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Details</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Screenshot</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
};


const sendDailyReport = async () => {
  console.log('Task started: Fetching data for daily report...');
  try {
 
    const { data, error } = await supabase.rpc('get_latest_check_results');
    if (error) throw error;
    
    if (data && data.length > 0) {
   
      const reportHTML = generateReportHTML(data);

      const recipient = [ "faariskhan213@gmail.com","gaureshgaude2@gmail.com","chethanbadiger245@gmail.com"];
      await sendEmail(recipient, 'Daily Website Checker Report', reportHTML);
      console.log('Daily report sent successfully.');
    } else {
      console.log('No data to report. Skipping email.');
    }
  } catch (err) {
    console.error('Failed to send daily report:', err);
  }
};

module.exports = { sendDailyReport };