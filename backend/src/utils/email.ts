import nodemailer from 'nodemailer';
import QRCode from 'qrcode';

// Disposable / Fake Email domains list to block non-genuine emails
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'tempmail.com', '10minutemail.com', 'dispostable.com',
  'guerrillamail.com', 'trashmail.com', 'sharklasers.com', 'yopmail.com',
  'getnada.com', 'throwawaymail.com', 'temp-mail.org', 'fakeinbox.com'
]);

export const validateEmailFormat = (email: string): { valid: boolean; reason?: string } => {
  if (!email || typeof email !== 'string') {
    return { valid: false, reason: 'Email is required' };
  }

  const cleanEmail = email.trim().toLowerCase();
  
  // RFC 5322 compliant regex for standard emails
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(cleanEmail)) {
    return { valid: false, reason: 'Invalid email format (e.g. name@domain.com required)' };
  }

  const domain = cleanEmail.split('@')[1];
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return { valid: false, reason: 'Disposable temporary email domains are not allowed. Please use a valid personal or business email.' };
  }

  return { valid: true };
};

// Create Nodemailer Transporter
const createTransporter = () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  // Fallback to Ethereal / JSON transport for local dev
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: process.env.SMTP_USER || 'ethereal.user@ethereal.email',
      pass: process.env.SMTP_PASS || 'ethereal_pass'
    }
  });
};

const transporter = createTransporter();

// Send 6-Digit Email Verification OTP
export const sendOtpEmail = async (email: string, otp: string, name: string) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM || '"Seatzy Verification" <verify@seatzy.com>',
    to: email,
    subject: `${otp} is your Seatzy Account Verification Code`,
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #f4f4f5; padding: 30px; text-align: center;">
        <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border: 4px solid #000000; box-shadow: 6px 6px 0px #000000; padding: 30px; text-align: left;">
          <h1 style="font-size: 28px; text-transform: uppercase; margin-bottom: 5px; color: #000000;">SEATZY</h1>
          <p style="font-size: 14px; text-transform: uppercase; color: #666; font-weight: bold; margin-top: 0;">Email Verification</p>
          <hr style="border: 2px solid #000000; margin: 20px 0;" />
          
          <p style="font-size: 16px; color: #000000;">Hi <strong>${name}</strong>,</p>
          <p style="font-size: 14px; color: #333333;">Welcome to Seatzy! Please use the 6-digit verification code below to verify your email address and activate your account:</p>
          
          <div style="background-color: #fef08a; border: 3px solid #000000; box-shadow: 4px 4px 0px #000000; padding: 15px; text-align: center; margin: 25px 0;">
            <span style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #000000;">${otp}</span>
          </div>

          <p style="font-size: 12px; color: #666666;">This code is valid for 10 minutes. If you did not register for Seatzy, please ignore this email.</p>
          <hr style="border: 1px solid #e4e4e7; margin: 20px 0;" />
          <p style="font-size: 11px; text-transform: uppercase; color: #a1a1aa; text-align: center;">Seatzy Live Events & Ticketing</p>
        </div>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`[VERIFICATION OTP SENT] Email: ${email} | Code: ${otp}`);
    if (previewUrl) {
      console.log(`[ETHEREAL MAIL PREVIEW]: ${previewUrl}`);
    }
    return { success: true, previewUrl };
  } catch (err) {
    console.error('Error sending OTP email:', err);
    console.log(`[VERIFICATION OTP FALLBACK LOG] Email: ${email} | Code: ${otp}`);
    return { success: false, otp };
  }
};

// Send Official Ticket with QR Code & Details
export const sendBookingEmail = async (
  email: string,
  bookingRef: string,
  showDetails: any,
  customerName?: string,
  seatLabels?: string[]
) => {
  const qrCodeDataUrl = await QRCode.toDataURL(bookingRef, { margin: 1, scale: 6 });
  const eventTitle = showDetails?.event?.title || 'Seatzy Live Event';
  const showDate = showDetails?.date ? new Date(showDetails.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : '';
  const showTime = showDetails?.time || '';
  const venueName = showDetails?.venue?.name || 'Main Arena';
  const venueAddress = showDetails?.venue?.address ? `${showDetails.venue.address}, ${showDetails.venue.city}` : '';
  const seatsText = seatLabels && seatLabels.length > 0 ? seatLabels.join(', ') : 'Reserved Seating';

  const mailOptions = {
    from: process.env.EMAIL_FROM || '"Seatzy Tickets" <tickets@seatzy.com>',
    to: email,
    subject: `🎟️ Your Confirmed Ticket: ${eventTitle} (${bookingRef})`,
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #f4f4f5; padding: 30px; text-align: center;">
        <div style="max-width: 550px; margin: 0 auto; background: #ffffff; border: 4px solid #000000; box-shadow: 8px 8px 0px #000000; text-align: left; overflow: hidden;">
          
          {/* Header Banner */}
          <div style="background-color: #000000; color: #ffffff; padding: 20px; text-align: center;">
            <h1 style="font-size: 26px; text-transform: uppercase; letter-spacing: 2px; margin: 0; color: #fef08a;">SEATZY OFFICIAL TICKET</h1>
            <p style="font-size: 12px; text-transform: uppercase; color: #a1a1aa; margin-top: 5px;">Present this QR code at entry</p>
          </div>

          <div style="padding: 25px;">
            {/* Event Name */}
            <h2 style="font-size: 24px; font-weight: 900; text-transform: uppercase; margin-top: 0; color: #000000;">${eventTitle}</h2>
            
            <div style="background-color: #fef08a; border: 2px solid #000000; padding: 12px; margin-bottom: 20px; font-weight: bold; font-size: 14px;">
              🗓️ ${showDate} @ ${showTime}
            </div>

            {/* Venue & Seats Info */}
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e4e4e7; font-size: 13px; color: #666; font-weight: bold; text-transform: uppercase;">Ticket Reference</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e4e4e7; font-size: 14px; color: #000; font-weight: bold; text-align: right;">${bookingRef}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e4e4e7; font-size: 13px; color: #666; font-weight: bold; text-transform: uppercase;">Attendee</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e4e4e7; font-size: 14px; color: #000; font-weight: bold; text-align: right;">${customerName || 'Seatzy Guest'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e4e4e7; font-size: 13px; color: #666; font-weight: bold; text-transform: uppercase;">Seats Assigned</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e4e4e7; font-size: 14px; color: #000; font-weight: bold; text-align: right;">${seatsText}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-size: 13px; color: #666; font-weight: bold; text-transform: uppercase;">Venue Location</td>
                <td style="padding: 8px 0; font-size: 13px; color: #000; font-weight: bold; text-align: right;">${venueName}<br/><span style="font-weight: normal; color: #666;">${venueAddress}</span></td>
              </tr>
            </table>

            {/* QR Code Embed */}
            <div style="text-align: center; background: #fafafa; border: 3px solid #000000; box-shadow: 4px 4px 0px #000000; padding: 20px; margin: 20px 0;">
              <img src="cid:qrcode" alt="Entry QR Code" style="width: 180px; height: 180px; display: block; margin: 0 auto; border: 2px solid #000;" />
              <p style="font-size: 11px; text-transform: uppercase; font-weight: bold; color: #000; margin-top: 10px; tracking-widest;">Scan at gate for entry</p>
            </div>
          </div>

          <div style="background-color: #f4f4f5; border-top: 2px solid #000000; padding: 15px; text-align: center;">
            <p style="font-size: 11px; color: #71717a; margin: 0; text-transform: uppercase;">Thank you for booking with Seatzy</p>
          </div>

        </div>
      </div>
    `,
    attachments: [
      {
        filename: `ticket-${bookingRef}.png`,
        content: qrCodeDataUrl.split('base64,')[1],
        encoding: 'base64',
        cid: 'qrcode'
      }
    ]
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[BOOKING TICKET EMAIL SENT] To: ${email} | Ref: ${bookingRef}`);
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[ETHEREAL TICKET PREVIEW]: ${previewUrl}`);
    }
    return qrCodeDataUrl;
  } catch (err) {
    console.error('Error sending ticket email:', err);
    return qrCodeDataUrl;
  }
};

export const sendWaitlistOfferEmail = async (email: string, token: string, showDetails: any) => {
  const offerLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/waitlist/offer/${token}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM || '"Seatzy Waitlist" <waitlist@seatzy.com>',
    to: email,
    subject: `🎉 Seat Available! Claim your ticket for ${showDetails.event.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #f4f4f5; padding: 30px; text-align: center;">
        <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border: 4px solid #000000; box-shadow: 6px 6px 0px #000000; padding: 30px; text-align: left;">
          <h1 style="font-size: 24px; text-transform: uppercase; margin-top: 0;">SEAT AVAILABLE!</h1>
          <p style="font-size: 14px; color: #333;">A ticket has just opened up for <strong>${showDetails.event.title}</strong>.</p>
          <div style="margin: 25px 0; text-align: center;">
            <a href="${offerLink}" style="background-color: #000000; color: #ffffff; border: 3px solid #000000; box-shadow: 4px 4px 0px #fef08a; padding: 14px 28px; text-decoration: none; font-weight: bold; text-transform: uppercase; display: inline-block;">Claim Your Ticket Now</a>
          </div>
          <p style="font-size: 12px; color: #666;">This offer expires in 15 minutes. If unclaimed, it will be automatically passed to the next person in line.</p>
        </div>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('[WAITLIST OFFER EMAIL SENT]:', nodemailer.getTestMessageUrl(info));
  } catch (err) {
    console.error('Error sending waitlist email', err);
  }
};
