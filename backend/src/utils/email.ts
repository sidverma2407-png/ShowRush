import QRCode from 'qrcode';
import dotenv from 'dotenv';
import https from 'https';
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

// Check if Brevo API key is configured
export const isSmtpConfigured = () => {
  const apiKey = (process.env.BREVO_API_KEY || '').trim();
  return Boolean(apiKey && apiKey.startsWith('xkeysib-'));
};

// Sender name & email from env
const getSenderEmail = () => {
  const fromEnv = (process.env.EMAIL_FROM || '').trim();
  // Parse "Name <email>" format
  const match = fromEnv.match(/<(.+)>/);
  if (match) return match[1];
  if (fromEnv.includes('@')) return fromEnv;
  return 'noreply@seatzy.com';
};

const getSenderName = () => {
  const fromEnv = (process.env.EMAIL_FROM || '').trim();
  const match = fromEnv.match(/^"?([^"<]+)"?\s*</);
  if (match) return match[1].trim();
  return 'Seatzy';
};

// ─────────────────────────────────────────────────────────────────────────────
// Core Brevo HTTP API sender — uses HTTPS port 443, works on ALL cloud hosts.
// SMTP ports (587/465) are blocked by Render free tier; HTTP API is not.
// Docs: https://developers.brevo.com/reference/sendtransacemail
// ─────────────────────────────────────────────────────────────────────────────
const sendViaBrevoApi = (payload: object): Promise<{ success: boolean; messageId?: string; reason?: string }> => {
  const apiKey = (process.env.BREVO_API_KEY || '').trim();
  if (!apiKey) {
    return Promise.resolve({ success: false, reason: 'BREVO_API_KEY not set' });
  }

  const body = JSON.stringify(payload);

  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'api.brevo.com',
      path: '/v3/smtp/email',
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            console.log(`[BREVO API] Email sent | MessageId: ${json.messageId}`);
            resolve({ success: true, messageId: json.messageId });
          } else {
            console.error(`[BREVO API ERROR] Status ${res.statusCode}:`, data);
            resolve({ success: false, reason: json.message || `HTTP ${res.statusCode}` });
          }
        } catch {
          resolve({ success: false, reason: 'Failed to parse Brevo API response' });
        }
      });
    });

    req.on('error', (err) => {
      console.error('[BREVO API NETWORK ERROR]', err.message);
      resolve({ success: false, reason: err.message });
    });

    req.setTimeout(15000, () => {
      req.destroy();
      resolve({ success: false, reason: 'Brevo API request timed out after 15s' });
    });

    req.write(body);
    req.end();
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Send 6-Digit Email Verification OTP
// ─────────────────────────────────────────────────────────────────────────────
export const sendOtpEmail = async (email: string, otp: string, name: string) => {
  if (!isSmtpConfigured()) {
    console.log(`[EMAIL SKIPPED] No BREVO_API_KEY configured. OTP for ${email} is ${otp}`);
    return { success: false, otp, reason: 'Email service not configured' };
  }

  const result = await sendViaBrevoApi({
    sender: { name: getSenderName(), email: getSenderEmail() },
    to: [{ email, name }],
    subject: `${otp} is your Seatzy Account Verification Code`,
    htmlContent: `
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
          <p style="font-size: 11px; text-transform: uppercase; color: #a1a1aa; text-align: center;">Seatzy Live Events &amp; Ticketing</p>
        </div>
      </div>
    `
  });

  if (!result.success) {
    console.error(`[EMAIL ERROR OTP to ${email}]:`, result.reason);
    return { success: false, otp, reason: result.reason };
  }

  return { success: true, messageId: result.messageId, previewUrl: undefined };
};

// ─────────────────────────────────────────────────────────────────────────────
// Send Official Ticket with QR Code & Details
// ─────────────────────────────────────────────────────────────────────────────
export const sendBookingEmail = async (
  email: string,
  bookingRef: string,
  showDetails: any,
  customerName?: string,
  seatLabels?: string[],
  totalPrice?: number,
  customerPhone?: string
) => {
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

  // QR code plain text
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
  const qrBase64 = qrCodeDataUrl.split('base64,')[1];

  // Event specific tailored warm wish
  let eventWish = "We hope you have an incredible time at the event!";
  if (eventType === 'MOVIE') eventWish = "Grab your popcorn, sit back, and enjoy the cinematic experience on the big screen!";
  else if (eventType === 'CONCERT') eventWish = "Get ready for an unmissable night of electrifying live music and pure energy!";
  else if (eventType === 'COMEDY') eventWish = "Prepare for non-stop laughter, hilarious stand-up punchlines, and great vibes!";
  else if (eventType === 'SPORTS') eventWish = "Wear your team colors, cheer loud, and feel the live stadium adrenaline!";

  if (!isSmtpConfigured()) {
    console.log(`[EMAIL SKIPPED] No BREVO_API_KEY. Ticket generated for ${email} Ref: ${bookingRef}`);
    return qrCodeDataUrl;
  }

  const result = await sendViaBrevoApi({
    sender: { name: getSenderName(), email: getSenderEmail() },
    to: [{ email, name: attendeeName }],
    subject: `Ticket Confirmed: ${eventTitle} (${bookingRef})`,
    attachment: [{ content: qrBase64, name: `ticket-${bookingRef}.png` }],
    htmlContent: `
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
              <p style="font-size: 14px; margin: 0; color: #18181b; font-weight: bold;">
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
                <td style="padding: 10px 0; font-size: 12px; color: #52525b; font-weight: 900; text-transform: uppercase; vertical-align: top;">Venue &amp; City</td>
                <td style="padding: 10px 0; font-size: 13px; color: #000000; font-weight: bold; text-align: right; line-height: 1.4;">
                  ${venueName}<br/>
                  <span style="font-weight: normal; color: #52525b;">${venueAddress}</span>
                </td>
              </tr>
            </table>

            <div style="text-align: center; background-color: #fafafa; border: 4px solid #000000; box-shadow: 6px 6px 0px #000000; padding: 25px; margin: 25px 0;">
              <p style="font-size: 13px; color: #52525b; margin: 0 0 12px 0;">Your QR code ticket is attached to this email as <strong>ticket-${bookingRef}.png</strong></p>
              <p style="font-size: 11px; text-transform: uppercase; font-weight: 900; color: #000000; margin: 0; letter-spacing: 2px;">
                PRESENT AT ENTRY GATE FOR SCANNING
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
    `
  });

  if (!result.success) {
    console.error(`[EMAIL ERROR ticket to ${email}]:`, result.reason);
  } else {
    console.log(`[BREVO TICKET SENT] To: ${email} | Ref: ${bookingRef}`);
  }

  return qrCodeDataUrl;
};

// ─────────────────────────────────────────────────────────────────────────────
// Send Waitlist Offer Email
// ─────────────────────────────────────────────────────────────────────────────
export const sendWaitlistOfferEmail = async (email: string, token: string, showDetails: any) => {
  if (!isSmtpConfigured()) {
    console.log(`[EMAIL SKIPPED] No BREVO_API_KEY. Waitlist link for ${email}`);
    return;
  }

  const offerLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/waitlist/offer/${token}`;

  const result = await sendViaBrevoApi({
    sender: { name: getSenderName(), email: getSenderEmail() },
    to: [{ email }],
    subject: `Seat Available! Claim your ticket for ${showDetails.event.title}`,
    htmlContent: `
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
  });

  if (!result.success) {
    console.error(`[EMAIL ERROR waitlist to ${email}]:`, result.reason);
  }
};
