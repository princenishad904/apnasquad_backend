import crypto from "crypto";

export const generateOTP = (length) => {
  let otp = "";
  for (let i = 1; i <= length; i++) {
    otp += crypto.randomInt(0, 10);
  }

  return otp;
};
