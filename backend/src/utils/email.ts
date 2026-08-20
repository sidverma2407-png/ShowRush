import nodemailer from 'nodemailer';
import QRCode from 'qrcode';

// Nodemailer transporter (Ethereal for dev)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: Number(process.env.SMTP_PORT) || 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export const sendBookingEmail = async (email: string, bookingRef: string, showDetails: any) => {
  // Generate QR Code as data URL
  const qrCodeDataUrl = await QRCode.toDataURL(bookingRef);

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'tickets@seatzy.local',
    to: email,
    subject: `Your Seatzy Ticket - ${bookingRef}`,
    html: `
      <h1>Booking Confirmed</h1>
      <p>Reference: ${bookingRef}</p>
      <p>Show: ${showDetails.event.title} at ${showDetails.date.toDateString()} ${showDetails.time}</p>
      <img src="cid:qrcode" alt="QR Code" />
    `,
    attachments: [
      {
        filename: 'qrcode.png',
        content: qrCodeDataUrl.split('base64,')[1],
        encoding: 'base64',
        cid: 'qrcode'
      }
    ]
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Booking email sent: ', nodemailer.getTestMessageUrl(info));
    return qrCodeDataUrl; // Return for storing in DB if needed
  } catch (err) {
    console.error('Error sending email', err);
  }
};

export const sendWaitlistOfferEmail = async (email: string, token: string, showDetails: any) => {
  const offerLink = `${process.env.FRONTEND_URL}/waitlist/offer/${token}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'tickets@seatzy.local',
    to: email,
    subject: `Seat Available! Claim your ticket for ${showDetails.event.title}`,
    html: `
      <h1>A seat has opened up!</h1>
      <p>You have a limited time to claim your seat for ${showDetails.event.title}.</p>
      <p><a href="${offerLink}">Click here to claim your seat</a></p>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Waitlist offer email sent: ', nodemailer.getTestMessageUrl(info));
  } catch (err) {
    console.error('Error sending waitlist email', err);
  }
};
