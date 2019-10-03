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
      port: process.env.NODE_ENV === 'production' ? 465 : 587,
      secure: process.env.NODE_ENV === 'production' ? true : false, // true for 465, false for other ports
      auth: {
          user: process.env.SMTP_EMAIL ,  // generated ethereal user
          pass: process.env.SMTP_PASSWORD // generated ethereal password
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


/**
 * function to send th results the crawler found among the registereed emails
 * @param {Object} results 
 * @example
 * {
 *  "2038722002": {
 *    "foundLinks": [],
 *    "emails": {
 *      "artium1new@gmail.com": true
 *    }
 *  },
 *  "2084409008": {
 *    "foundLinks": [],
 *    "emails": {
 *      "artium1@gmail.com": true
 *    }
 *  }
 * }
 */
function sendLinks(results) {
  for(let hash in results) {
    for(let email in results[hash].emails) {
      const linksFound = results[hash].foundLinks

      if (!linksFound.length) continue 

      const emailObj = {
        fromEmail:'yad2alerter@artyum.co',
        toEmail: email,
        subject:'new apartments found!', 
        text: linksFound.map(id => 'https://www.yad2.co.il/item/'.concat(id) + '\n').toString().replace(/,/g, ''),
        html:''
      }

      sendEmail(emailObj)
      .then(res => console.log({ senTto:email, res }))
      .catch(console.error)
    }
  }
} 




module.exports = { sendEmail, sendLinks }