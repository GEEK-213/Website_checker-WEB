// services/reportService.js

const supabase = require('../supabaseClient');
const { sendEmail } = require('./emailServices');

/**
 * Generates an Enterprise HTML report from the check results.
 */
const generateReportHTML = (results) => {
  const dateStr = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const rows = results.map(result => {
    const statusColor = result.status === 'good' ? '#10b981' : '#ef4444';
    const statusLabel = result.status === 'good' ? 'OPTIMAL' : result.status.toUpperCase().replace('_', ' ');
    
    return `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px;">
          <strong>${result.url}</strong>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; font-weight: bold; color: ${statusColor};">
          ${statusLabel}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">
          ${result.load_time ? `${result.load_time}ms` : '--'}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">
           ${result.error_log || 'None'}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px;">
          <a href="${result.screenshot}" style="color: #db1439; text-decoration: none; font-weight: 500;">View Capture</a>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; color: #1e293b; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
      <div style="background-color: #0f172a; padding: 24px; border-radius: 8px 8px 0 0; text-align: left;">
        <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;">Infrastructure Status Report</h1>
        <p style="color: #94a3b8; margin: 8px 0 0 0; font-size: 14px;">${dateStr} | Ethernet Express Standard</p>
      </div>
      <div style="background-color: #ffffff; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0; border-top: none;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr>
              <th style="padding: 12px; border-bottom: 2px solid #f1f5f9; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b;">Property</th>
              <th style="padding: 12px; border-bottom: 2px solid #f1f5f9; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b;">Status</th>
              <th style="padding: 12px; border-bottom: 2px solid #f1f5f9; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b;">Latency</th>
              <th style="padding: 12px; border-bottom: 2px solid #f1f5f9; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b;">Technical Log</th>
              <th style="padding: 12px; border-bottom: 2px solid #f1f5f9; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b;">Archive</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #f1f5f9; text-align: center;">
          <p style="font-size: 12px; color: #94a3b8;">This is an automated operational report from your Website Checker instance.</p>
        </div>
      </div>
    </div>
  `;
};

const sendDailyReport = async () => {
  console.log('Task started: Fetching data for daily operational report...');
  try {
    const { data, error } = await supabase.rpc('get_latest_check_results');
    if (error) throw error;
    
    if (data && data.length > 0) {
      const reportHTML = generateReportHTML(data);
      const recipients = process.env.REPORT_RECIPIENTS; 
      
      if (!recipients) {
          console.error('REPORT_RECIPIENTS environment variable not set.');
          return;
      }
      
      await sendEmail(recipients, `Infrastructure Report: ${new Date().toLocaleDateString()}`, reportHTML);
      console.log(`Daily operational report sent successfully to: ${recipients}`);
    } else {
      console.log('No monitor data found for reporting.');
    }
  } catch (err) {
    console.error('Operational report routing failure:', err);
  }
};

module.exports = { sendDailyReport };