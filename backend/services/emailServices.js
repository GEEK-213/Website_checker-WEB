// services/mailService.js

const nodemailer = require('nodemailer');
const sgTransport = require('nodemailer-sendgrid-transport');

const options = {
  auth: {
    // This reads the API key from your Render environment variables
    api_key: process.env.SENDGRID_API_KEY
  }
};

const transporter = nodemailer.createTransport(sgTransport(options));

const sendEmail = async (to, subject, html) => {
  try {
    const mailOptions = {
      // IMPORTANT: Use the email address you verified in SendGrid
      from: `"Website Checker Report" <valorantgrim1234@gmail.com>`,
      to: to,
      subject: subject,
      html: html,
    };

    let info = await transporter.sendMail(mailOptions);
    console.log('Email sent via SendGrid: ' + info.messageId);
  } catch (error) {
    console.error('Error sending email via SendGrid:', error);
    if (error.response) {
        console.error(error.response.body)
    }
    throw error;
  }
};

module.exports = { sendEmail };