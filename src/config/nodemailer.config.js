import {createTransport} from "nodemailer"
import {config} from "./index.js"

export const transporter = createTransport({
    service:"gmail",
    auth:{
        user:config.SENDER_EMAIL,
        pass:config.EMAIL_PASSWORD
    }
  
})
