import { transporter } from "../config/nodemailer.config.js";

import { config } from "../config/index.js";
import {fileURLToPath} from 'url'
import path from 'path'
import fs, { readFileSync } from 'fs'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


export const sendEmail = async (email,
  subject,
  data = {},
  template = "default")=>{

    let html = readFileSync(path.join(__dirname,"./templates",`${template}.html`),'utf8')

  html = html.replace(/{{(.*?)}}/g, (_, key) => data[key.trim()] || "");

  try {
       const mailOptions = {
      from: config.SENDER_EMAIL,
      to: email,
      subject,
      html,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.log(`error in send email ${error}`);
    throw new Error(error?.message);
  }

}