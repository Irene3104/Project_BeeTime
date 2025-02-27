import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

export const sendVerificationEmail = async (email: string, code: string) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Bee Time Password Reset Verification Code',
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h2>Password Reset Verification Code</h2>
        <p>Please enter the verification code below:</p>
        <h1 style="color: #ffa432;">${code}</h1>
        <p>This code is valid for 5 minutes only.</p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};