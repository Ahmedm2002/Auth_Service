import nodemailer from "nodemailer";

const transport = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GOOGLE_EMAIL,
    pass: process.env.GOOGLE_APP_PASSWORD,
  },
});

async function testNodemailer() {
  try {
    await transport.verify();
    console.log("Email Transport setup successfull");
  } catch (err) {
    console.error("Verification failed", err);
  }
}

// testNodemailer();

export default transport;
