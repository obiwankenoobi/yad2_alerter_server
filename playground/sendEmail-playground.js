const sendEmail = require('../services/sendEmail')

const emailObj = {
  fromEmail:'dev@inlyne.co',
  toEmail:'artium1@gmail.com',
  subject:'hello world', 
  text:'how are you',
  html:''
}
sendEmail(emailObj).catch(console.error);