'use strict';
const nodemailer = require('nodemailer');

/**
 * the email object to send
 * @typedef {EmailObject}  
 * @property {String} fromEmail 
 * @property {String} toEmail
 * @property {String} subject
 * @property {String} text
 * @property {String} html
 */
/**
 * function to send an email
 * @param {EmailObject} emailObj 
 */
async function sendEmail(emailObj) {

  const { 
    fromEmail,
    toEmail,
    subject, 
    text,
    html
  } = emailObj

    // create reusable transporter object using the default SMTP transport
    const transporter = nodemailer.createTransport({
        host: 'smtp.office365.com',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_EMAIL || 'dev@inlyne.co', // generated ethereal user
            pass: process.env.SMTP_PASSWORD || '&40Max51@/-Re' // generated ethereal password
        }
    });

    console.log('process.env.SMTP_EMAIL', process.env.SMTP_EMAIL)
    // send mail with defined transport object
    const info = await transporter.sendMail({
        from: fromEmail, // sender address
        to: toEmail, // list of receivers
        subject, // Subject line
        text, // plain text body
        html // html body
    });

    console.log('Message sent: %s', info.messageId);
    // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

    // Preview only available when sending through an Ethereal account
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
}



module.exports = sendEmail