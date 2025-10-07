// services/mailService.js

const nodemailer = require('nodemailer');

// Create a more explicit transporter object for Gmail
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, 
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Sends an email.
 * @param {string} to - The recipient's email address.
 * @param {string} subject - The subject of the email.
 * @param {string} html - The HTML content of the email.
 */
const sendEmail = async (to, subject, html) => {
  try {
    const mailOptions = {
      from: `"Website Checker Report" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject,
      html: html, 
    };

    let info = await transporter.sendMail(mailOptions);
    console.log('Email sent: ' + info.response);
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

module.exports = { sendEmail };