// Contact-form logic shared by server.js (local) and netlify/functions/contact.js (Netlify)
const nodemailer = require('nodemailer');

const COMPANY = 'Sri Peddammathalli Creations';

// ---------- Mail transport ----------
let transporterPromise;
let demoMode = false;

function getTransporter() {
  if (transporterPromise) return transporterPromise;
  if (process.env.SMTP_HOST) {
    transporterPromise = Promise.resolve(nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: String(process.env.SMTP_SECURE ?? 'true') === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    }));
  } else {
    demoMode = true;
    transporterPromise = nodemailer.createTestAccount().then((acc) => {
      console.log('[mail] DEMO mode - using Ethereal test inbox:', acc.user);
      return nodemailer.createTransport({
        host: acc.smtp.host, port: acc.smtp.port, secure: acc.smtp.secure,
        auth: { user: acc.user, pass: acc.pass },
      });
    });
    transporterPromise.catch(() => { transporterPromise = undefined; });
  }
  return transporterPromise;
}

// ---------- Helpers ----------
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[+\d][\d\s-]{6,16}$/;
const ENQUIRY_TYPES = ['General Enquiry', 'Film Collaboration', 'Story / Script Submission',
  'Casting / Auditions', 'Distribution & Rights', 'Media & Press'];

function validate(body) {
  const data = {
    name: String(body.name || '').trim(),
    email: String(body.email || '').trim(),
    phone: String(body.phone || '').trim(),
    enquiryType: String(body.enquiryType || '').trim(),
    message: String(body.message || '').trim(),
  };
  const errors = {};
  if (data.name.length < 2 || data.name.length > 80) errors.name = 'Please enter your full name.';
  if (!EMAIL_RE.test(data.email) || data.email.length > 120) errors.email = 'Please enter a valid email address.';
  if (data.phone && !PHONE_RE.test(data.phone)) errors.phone = 'Please enter a valid phone number.';
  if (!ENQUIRY_TYPES.includes(data.enquiryType)) errors.enquiryType = 'Please choose an enquiry type.';
  if (data.message.length < 10 || data.message.length > 2000) errors.message = 'Message should be 10–2000 characters.';
  if (body.consent !== true) errors.consent = 'Please accept the privacy policy.';
  return { data, errors };
}

// Simple in-memory rate limit: 5 submissions per IP per 15 minutes
// (on Netlify this is per function instance, so it is best-effort only)
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now(), windowMs = 15 * 60 * 1000;
  const list = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(ip, list);
  return list.length > 5;
}

function mailShell(title, inner) {
  return `<div style="font-family:Arial,sans-serif;background:#f6efe4;padding:24px">
  <div style="max-width:600px;margin:auto;background:#fff;border-radius:10px;overflow:hidden;border:1px solid #e6d3a3">
    <div style="background:#5a0f14;color:#f5d27a;padding:20px 24px">
      <div style="font-size:20px;font-weight:bold;letter-spacing:1px">${COMPANY.toUpperCase()}</div>
      <div style="font-size:13px;color:#f3e6c4">${title}</div>
    </div>
    <div style="padding:24px;color:#2b1a12;font-size:15px;line-height:1.6">${inner}</div>
    <div style="background:#f6efe4;padding:14px 24px;font-size:12px;color:#7a5c3a">
      Member – Telugu Film Chamber of Commerce (Producer Sector) · Hyderabad, Telangana
    </div>
  </div></div>`;
}

/** Handles a contact submission. Returns { status, json }. */
async function handleContact(body, ip) {
  body = body || {};
  if (body.website) return { status: 200, json: { ok: true } }; // honeypot: silently drop bots
  if (rateLimited(ip || 'unknown')) {
    return { status: 429, json: { ok: false, message: 'Too many requests. Please try again later.' } };
  }

  const { data, errors } = validate(body);
  if (Object.keys(errors).length) return { status: 400, json: { ok: false, errors } };

  const e = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, escapeHtml(v)]));
  const ref = 'SPC-' + Date.now().toString(36).toUpperCase();

  try {
    const transporter = await getTransporter();
    const fromAddr = process.env.MAIL_FROM_ADDRESS || process.env.SMTP_USER || 'no-reply@example.com';
    const from = `"${process.env.MAIL_FROM_NAME || COMPANY}" <${fromAddr}>`;
    const adminEmail = process.env.ADMIN_EMAIL || fromAddr;

    const row = (k, v) => `<tr><td style="padding:6px 12px 6px 0;color:#7a5c3a;white-space:nowrap">${k}</td><td style="padding:6px 0">${v}</td></tr>`;

    const adminMail = transporter.sendMail({
      from, to: adminEmail, replyTo: data.email,
      subject: `New enquiry [${ref}] – ${data.enquiryType} – ${data.name}`,
      text: `Ref: ${ref}\nName: ${data.name}\nEmail: ${data.email}\nPhone: ${data.phone || '-'}\nType: ${data.enquiryType}\n\n${data.message}`,
      html: mailShell('New website enquiry', `
        <p>A new enquiry was submitted on the website.</p>
        <table style="border-collapse:collapse;font-size:14px">
          ${row('Reference', ref)}${row('Name', e.name)}${row('Email', `<a href="mailto:${e.email}">${e.email}</a>`)}
          ${row('Phone', e.phone || '-')}${row('Enquiry type', e.enquiryType)}
        </table>
        <p style="margin-top:16px;padding:14px;background:#faf5ea;border-left:4px solid #c9a227;white-space:pre-wrap">${e.message}</p>
        <p style="font-size:13px;color:#7a5c3a">Reply directly to this email to respond to the visitor.</p>`),
    });

    const customerMail = transporter.sendMail({
      from, to: data.email, replyTo: adminEmail,
      subject: `Thank you for contacting ${COMPANY} [${ref}]`,
      text: `Dear ${data.name},\n\nThank you for reaching out to ${COMPANY}. We have received your enquiry (${data.enquiryType}) and our team will get back to you shortly.\n\nReference: ${ref}\n\nYour message:\n${data.message}\n\nWarm regards,\n${COMPANY}\nHyderabad, Telangana`,
      html: mailShell('We have received your enquiry', `
        <p>Dear ${e.name},</p>
        <p>Namaskaram! Thank you for reaching out to <b>${COMPANY}</b>. We have received your
        <b>${e.enquiryType}</b> and our team will get back to you shortly.</p>
        <p>Your reference number is <b>${ref}</b>.</p>
        <p style="margin-top:16px;padding:14px;background:#faf5ea;border-left:4px solid #c9a227;white-space:pre-wrap">${e.message}</p>
        <p>Warm regards,<br><b>${COMPANY}</b><br>Hyderabad, Telangana</p>`),
    });

    const [a, c] = await Promise.all([adminMail, customerMail]);
    if (demoMode) {
      console.log(`[mail] ${ref} admin preview:    ${nodemailer.getTestMessageUrl(a)}`);
      console.log(`[mail] ${ref} customer preview: ${nodemailer.getTestMessageUrl(c)}`);
    }
    return { status: 200, json: { ok: true, ref } };
  } catch (err) {
    console.error('[mail] send failed:', err.message);
    return { status: 502, json: { ok: false, message: 'We could not send your message right now. Please call or email us directly.' } };
  }
}

module.exports = { handleContact, COMPANY };
