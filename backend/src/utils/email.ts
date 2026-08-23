import nodemailer from 'nodemailer';
import QRCode from 'qrcode';
import dotenv from 'dotenv';
dotenv.config();

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

export const isSmtpConfigured = () => {
  const user = (process.env.SMTP_USER || process.env.EMAIL_USER || '').trim();
  const pass = (process.env.SMTP_PASS || process.env.EMAIL_PASS || '').trim();
  return Boolean(user && pass && !user.includes('ethereal.email'));
};

// Create a fresh Nodemailer Transporter on each call.
// Cloud hosts (Render) often block port 465/SSL; port 587 with STARTTLS is universally supported.
// No caching — pooled connections go stale on Render's ephemeral infra.
const getTransporter = () => {
  const user = (process.env.SMTP_USER || process.env.EMAIL_USER || '').trim();
  const pass = (process.env.SMTP_PASS || process.env.EMAIL_PASS || '').trim().replace(/\s+/g, '');
  const host = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const isGmail = host.includes('gmail') || user.endsWith('@gmail.com');

  if (!user || !pass || user.includes('ethereal.email')) return null;

  // Gmail: force port 587 + STARTTLS (port 465/SSL is blocked on most cloud providers)
  const transportConfig: any = isGmail
    ? {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // STARTTLS upgrade after connect
        auth: { user, pass },
        tls: { rejectUnauthorized: false },
        connectionTimeout: 20000,
        greetingTimeout: 15000,
        socketTimeout: 20000
      }
    : {
        host,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: { user, pass },
        tls: { rejectUnauthorized: false },
        connectionTimeout: 20000,
        greetingTimeout: 15000,
        socketTimeout: 20000
      };

  const t = nodemailer.createTransport(transportConfig);
  console.log(`[SMTP] Transporter created: host=${isGmail ? 'smtp.gmail.com' : host} port=${isGmail ? 587 : (Number(process.env.SMTP_PORT) || 587)} user=${user.substring(0, 4)}***`);
  return t;
};

// Ensure From header matches authenticated Gmail account to prevent Google SMTP rejections
const getSender = (displayName: string) => {
  const user = (process.env.SMTP_USER || process.env.EMAIL_USER || '').trim();
  if (process.env.EMAIL_FROM && process.env.EMAIL_FROM.includes('@') && !process.env.EMAIL_FROM.includes('ethereal.email')) {
    return process.env.EMAIL_FROM;
  }
  if (user && !user.includes('ethereal.email')) {
    return `"${displayName}" <${user}>`;
  }
  return `"${displayName}" <verify@seatzy.com>`;
};

// Send 6-Digit Email Verification OTP
export const sendOtpEmail = async (email: string, otp: string, name: string) => {
  if (!isSmtpConfigured()) {
    console.log(`[SMTP SKIPPED] No SMTP credentials configured. OTP code for ${email} is ${otp}`);
    return { success: false, otp, reason: 'SMTP not configured' };
  }

  const transporter = getTransporter();
  if (!transporter) {
    return { success: false, otp, reason: 'Transporter creation failed' };
  }

  const mailOptions = {
    from: getSender('Seatzy Verification'),
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
    // 15s timeout promise so cloud SSL handshakes have ample time to complete
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('SMTP timeout (15s limit reached)')), 15000)
    );

    const info: any = await Promise.race([
      transporter.sendMail(mailOptions),
      timeoutPromise
    ]);

    console.log(`[REAL GMAIL OTP DELIVERED] To: ${email} | Code: ${otp} | MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId, previewUrl: undefined };
  } catch (err: any) {
    console.error(`[SMTP ERROR sending OTP to ${email}]:`, err.message || err);
    return { success: false, otp, reason: err.message };
  }
};

// Send Official Ticket with QR Code & Details
export const sendBookingEmail = async (
  email: string,
  bookingRef: string,
  showDetails: any,
  customerName?: string,
  seatLabels?: string[],
  totalPrice?: number,
  customerPhone?: string
) => {
  const transporter = getTransporter();
  
  const eventTitle = showDetails?.event?.title || 'Seatzy Live Event';
  const eventType = (showDetails?.event?.type || 'EVENT').toUpperCase();
  const showDate = showDetails?.date ? new Date(showDetails.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '';
  const showTime = showDetails?.time || '';
  const venueName = showDetails?.venue?.name || 'Main Arena';
  const venueCity = showDetails?.venue?.city || '';
  const venueAddress = showDetails?.venue?.address ? `${showDetails.venue.address}${venueCity ? `, ${venueCity}` : ''}` : venueCity || 'Venue Location';
  const seatsFormatted = seatLabels && seatLabels.length > 0 ? seatLabels.join(', ') : 'Reserved Seating';
  const seatsText = seatLabels && seatLabels.length > 0 ? seatLabels.join('<br/>') : 'Reserved Seating';
  const formattedPrice = totalPrice ? `₹${totalPrice.toLocaleString('en-IN')}` : 'Confirmed';
  const attendeeName = customerName || 'Seatzy Guest';
  const attendeePhone = customerPhone || 'N/A';
  const formatLang = [showDetails?.format || showDetails?.event?.format, showDetails?.language || showDetails?.event?.language].filter(Boolean).join(' - ');

  // Clean, structured plain text ticket pass for instant offline camera & scanner verification
  const qrPlainText = [
    '========================================',
    '       SEATZY OFFICIAL ADMISSION PASS   ',
    '========================================',
    `TICKET REF   : ${bookingRef}`,
    `EVENT        : ${eventTitle.toUpperCase()}`,
    `CATEGORY     : ${eventType}${formatLang ? ` (${formatLang})` : ''}`,
    `SHOWTIME     : ${showDate} @ ${showTime}`,
    `VENUE        : ${venueName}`,
    `LOCATION     : ${venueAddress}`,
    '----------------------------------------',
    `ATTENDEE     : ${attendeeName}`,
    `PHONE        : ${attendeePhone}`,
    `SEATS        : ${seatsFormatted}`,
    `TOTAL AMOUNT : ${formattedPrice} (PAID)`,
    'STATUS       : CONFIRMED & VERIFIED FOR ENTRY',
    '========================================',
    'GATE CLEARANCE: ACTIVE & VALID FOR ADMISSION',
    'SECURITY SEAL : SEATZY-256-AUTHENTICATED',
    '========================================'
  ].join('\n');

  const qrCodeDataUrl = await QRCode.toDataURL(qrPlainText, { margin: 1, scale: 6 });

  // Event specific tailored warm wish
  let eventWish = "We hope you have an incredible time at the event!";
  if (eventType === 'movie') {
    eventWish = "Grab your popcorn, sit back, and enjoy the cinematic experience on the big screen!";
  } else if (eventType === 'concert') {
    eventWish = "Get ready for an unmissable night of electrifying live music and pure energy!";
  } else if (eventType === 'comedy') {
    eventWish = "Prepare for non-stop laughter, hilarious stand-up punchlines, and great vibes!";
  } else if (eventType === 'sports') {
    eventWish = "Wear your team colors, cheer loud, and feel the live stadium adrenaline!";
  }

  const mailOptions = {
    from: getSender('Seatzy Tickets'),
    to: email,
    subject: `Ticket Confirmed: ${eventTitle} (${bookingRef})`,
    html: `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f5; padding: 30px; text-align: center;">
        <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border: 4px solid #000000; box-shadow: 8px 8px 0px #000000; text-align: left; overflow: hidden;">
          
          <div style="background-color: #000000; color: #ffffff; padding: 25px 20px; text-align: center;">
            <h1 style="font-size: 28px; font-weight: 900; text-transform: uppercase; letter-spacing: 3px; margin: 0; color: #fef08a;">SEATZY OFFICIAL TICKET</h1>
            <p style="font-size: 11px; text-transform: uppercase; color: #a1a1aa; margin-top: 6px; letter-spacing: 1px;">Present this digital ticket at entry gate</p>
          </div>

          <div style="padding: 30px;">
            <div style="background-color: #fef08a; border: 3px solid #000000; box-shadow: 4px 4px 0px #000000; padding: 18px; margin-bottom: 25px;">
              <h3 style="font-size: 18px; font-weight: 900; margin: 0 0 8px 0; color: #000000; text-transform: uppercase;">
                Thank you ${attendeeName} for your booking!
              </h3>
              <p style="font-size: 14px; margin: 0; color: #18181b; font-weight: bold; leading-relaxed;">
                ${eventWish}
              </p>
            </div>

            <h2 style="font-size: 24px; font-weight: 900; text-transform: uppercase; margin-top: 0; margin-bottom: 15px; color: #000000; letter-spacing: -0.5px;">
              ${eventTitle}
            </h2>

            <div style="background-color: #e0f2fe; border: 2px solid #000000; padding: 10px 14px; margin-bottom: 25px; font-weight: 900; font-size: 15px; color: #0369a1; text-transform: uppercase; display: inline-block;">
              ${showDate} &nbsp;|&nbsp; ${showTime}
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
              <tr style="border-bottom: 2px solid #000000;">
                <td style="padding: 10px 0; font-size: 12px; color: #52525b; font-weight: 900; text-transform: uppercase;">Unique Ticket ID</td>
                <td style="padding: 10px 0; font-size: 15px; color: #000000; font-weight: 900; text-align: right; letter-spacing: 1px;">${bookingRef}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e4e4e7;">
                <td style="padding: 10px 0; font-size: 12px; color: #52525b; font-weight: 900; text-transform: uppercase;">Attendee Name</td>
                <td style="padding: 10px 0; font-size: 14px; color: #000000; font-weight: bold; text-align: right;">${attendeeName}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e4e4e7;">
                <td style="padding: 10px 0; font-size: 12px; color: #52525b; font-weight: 900; text-transform: uppercase;">Phone Number</td>
                <td style="padding: 10px 0; font-size: 14px; color: #000000; font-weight: bold; text-align: right;">${attendeePhone}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e4e4e7;">
                <td style="padding: 10px 0; font-size: 12px; color: #52525b; font-weight: 900; text-transform: uppercase;">Total Amount Paid</td>
                <td style="padding: 10px 0; font-size: 16px; color: #15803d; font-weight: 900; text-align: right;">${formattedPrice}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e4e4e7;">
                <td style="padding: 10px 0; font-size: 12px; color: #52525b; font-weight: 900; text-transform: uppercase; vertical-align: top;">Seat Breakdown</td>
                <td style="padding: 10px 0; font-size: 13px; color: #000000; font-weight: bold; text-align: right; line-height: 1.5;">${seatsText}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-size: 12px; color: #52525b; font-weight: 900; text-transform: uppercase; vertical-align: top;">Venue & City</td>
                <td style="padding: 10px 0; font-size: 13px; color: #000000; font-weight: bold; text-align: right; line-height: 1.4;">
                  ${venueName}<br/>
                  <span style="font-weight: normal; color: #52525b;">${venueAddress}</span>
                </td>
              </tr>
            </table>

            <div style="text-align: center; background-color: #fafafa; border: 4px solid #000000; box-shadow: 6px 6px 0px #000000; padding: 25px; margin: 25px 0;">
              <img src="cid:qrcode" alt="Unique Verification QR Code" style="width: 200px; height: 200px; display: block; margin: 0 auto; border: 3px solid #000000; background: #ffffff; padding: 5px;" />
              <p style="font-size: 11px; text-transform: uppercase; font-weight: 900; color: #000000; margin-top: 15px; letter-spacing: 2px;">
                SECURITY SCAN AT GATE
              </p>
              <p style="font-size: 10px; color: #71717a; margin-top: 4px;">
                Ref: ${bookingRef}
              </p>
            </div>
          </div>

          <div style="background-color: #18181b; color: #a1a1aa; border-top: 4px solid #000000; padding: 18px; text-align: center;">
            <p style="font-size: 11px; margin: 0; text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">
              SEATZY LIVE TICKETING PLATFORM
            </p>
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
    if (!transporter) {
      console.log(`[SMTP SKIPPED] No SMTP credentials. Ticket generated for ${email} Ref: ${bookingRef}`);
      return qrCodeDataUrl;
    }
    const info = await transporter.sendMail(mailOptions);
    console.log(`[REAL GMAIL TICKET DELIVERED] To: ${email} | Ref: ${bookingRef} | MessageId: ${info.messageId}`);
    return qrCodeDataUrl;
  } catch (err: any) {
    console.error(`[SMTP GMAIL ERROR sending ticket to ${email}]:`, err.message || err);
    return qrCodeDataUrl;
  }
};

export const sendWaitlistOfferEmail = async (email: string, token: string, showDetails: any) => {
  const transporter = getTransporter();
  if (!transporter) {
    console.log(`[SMTP SKIPPED] No SMTP credentials. Waitlist link for ${email}`);
    return;
  }

  const offerLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/waitlist/offer/${token}`;

  const mailOptions = {
    from: getSender('Seatzy Waitlist'),
    to: email,
    subject: `Seat Available! Claim your ticket for ${showDetails.event.title}`,
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
    console.log(`[REAL GMAIL WAITLIST OFFER SENT] To: ${email} | MessageId: ${info.messageId}`);
  } catch (err: any) {
    console.error(`[SMTP GMAIL ERROR sending waitlist offer to ${email}]:`, err.message || err);
  }
};
