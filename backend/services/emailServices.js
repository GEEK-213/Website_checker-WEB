const nodemailer = require('nodemailer');


const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // This is your 16-character App Password
    },
});

/**

 * @param {string} to 
 * @param {string} subject The subject line of the email.
 * @param {string} text The plain text body of the email.
 * @param {Array} attachments An array of attachment objects for nodemailer.
 */
const sendEmail = async (to, subject, text, attachments) => {
    try {
        // 2. Send the email using the pre-configured transporter
        await transporter.sendMail({
            from: `"Website Checker" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: subject,
            text: text,
            attachments: attachments,
        });
        console.log(`✅ Email report sent successfully to ${to}`);
    } catch (error) {
        // 3. Log any errors that occur during the process
        console.error('Error sending email:', error);
    }
};

module.exports = { sendEmail };

