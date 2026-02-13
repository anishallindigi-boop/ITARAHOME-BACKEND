import axios from "axios";

let shiprocketToken = null;

export const getShiprocketToken = async () => {
  if (shiprocketToken) return shiprocketToken;

  const res = await axios.post(
    "https://apiv2.shiprocket.in/v1/external/auth/login",
    {
      email: process.env.SHIPROCKET_EMAIL,
      password: process.env.SHIPROCKET_PASSWORD,
    }
  );

  shiprocketToken = res.data.token;
  return shiprocketToken;
};
