const nodemailer = require("nodemailer");
const dotenv = require('dotenv');

dotenv.config();

const usermailer=process.env.BREVO_SMTP_USER;
const userpass=process.env.BREVO_SMTP_KEY;

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: {
    user: usermailer,
    pass:userpass,
  },
});

module.exports = transporter;

//kdfhjdfhgjh