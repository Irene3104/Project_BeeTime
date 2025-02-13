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
    subject: 'Bee Time 비밀번호 재설정 인증 코드',
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h2>비밀번호 재설정 인증 코드</h2>
        <p>아래의 인증 코드를 입력해주세요:</p>
        <h1 style="color: #FFE26C;">${code}</h1>
        <p>이 코드는 5분 동안만 유효합니다.</p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};