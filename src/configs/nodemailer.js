import nodemailer from "nodemailer";

const transport = nodemailer.createTransport({
  service: "gmail",
  auth: {
    type: "OAuth2",
    user: "ahmed.tecklogics@gmail.com",
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
  },
});

async function testNodemailer() {
  try {
    await transport.verify();
    console.log("Transport setup successfull");
  } catch (err) {
    console.error("Verification failed", err);
  }
}

testNodemailer();

export default transport;
