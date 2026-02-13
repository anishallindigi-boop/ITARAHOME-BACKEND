const axios=require("axios")
function generateOTP() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
 
  return { otp };
}

// Replace this with real SMS service (e.g., Twilio)

function sendOtpToPhone(phone, otp) {
  console.log(`Sending OTP ${otp} to phone: ${phone}`);

  const url = `https://pgapi.smartping.ai/fe/api/v1/send?username=demoapi.trans&password=@Demoapi@123&unicode=false&from=WEBSTK&to=${phone}&dltPrincipalEntityId=1001712974785338383&dltContentId=1307173011315167462&text=To login to App, please use OTP : ${otp} Powered by Webstruck`;

  return axios
    .post(url)
    .then(response => {
      console.log("OTP sent successfully:", response.data);
      return response.data;
    })
    .catch(error => {
      console.error("Error sending OTP:", error.response ? error.response.data : error.message);
      throw error;
    });
}


module.exports = { generateOTP, sendOtpToPhone };
