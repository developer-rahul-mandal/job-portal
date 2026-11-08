
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

interface SendOtpEmailParams {
  email: string;
  otp: string;
  purpose: "REGISTER" | "LOGIN";
}

export async function sendOtpEmail({
  email,
  otp,
  purpose,
}: SendOtpEmailParams) {
  const subject =
    purpose === "REGISTER"
      ? "Verify your email address"
      : "Your login verification code";

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject,
    text: `Your verification code is ${otp}. It expires in 10 minutes. Do not share this code with anyone.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto">
        <h2>Email Verification</h2>
        <p>Your verification code is:</p>
        <h1 style="letter-spacing:8px">${otp}</h1>
        <p>This code expires in 10 minutes.</p>
        <p>Do not share this code with anyone.</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Resend email failed: ${error.message}`);
  }

  return data;
}
