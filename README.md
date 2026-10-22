# Sri Peddammathalli Creations – Website (Demo)

Official website for **Sri Peddammathalli Creations**, a Telugu film production house in Hyderabad
(TFCC Life Member – Producer Sector).

## Stack
- Static site in `public/` (HTML/CSS/vanilla JS, no build step)
- `server.js`: Express server that serves the site and handles `POST /api/contact`
- Nodemailer sends **two emails** for every enquiry:
  1. **Admin notification** to `ADMIN_EMAIL` (Reply-To set to the visitor)
  2. **Confirmation** to the visitor, with a reference number

## Run locally
```bash
npm install
npm start          # http://localhost:3000
```
If `.env` has no SMTP settings, the form runs in **demo mode**: mails go to a temporary
[Ethereal](https://ethereal.email) inbox and preview links for both mails are printed in the console.

## Go live (real emails)
1. `cp .env.example .env`
2. Fill in the SMTP details. For Gmail: `smtp.gmail.com`, port `465`, and a 16-character
   [App Password](https://myaccount.google.com/apppasswords) (requires 2-Step Verification).
3. Set `ADMIN_EMAIL` to the client's inbox.
4. Restart the server.

## Deploy to Netlify
On Netlify, `public/` is served as static files and the contact form runs as a Netlify Function
(`netlify/functions/contact.js`; `/api/contact` is redirected to it in `netlify.toml`).
`server.js` is only used for local development.

```bash
npm install
npx netlify-cli login                 # opens browser once
npx netlify-cli deploy --prod         # first time: choose "Create & configure a new project"
```
Then in Netlify → **Project configuration → Environment variables**, add the same keys as `.env.example`
(`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM_NAME`, `MAIL_FROM_ADDRESS`, `ADMIN_EMAIL`)
and run `npx netlify-cli deploy --prod` again. Without them the form stays in demo mode
(Ethereal preview links appear under **Logs → Functions → contact**).

## Placeholders to replace before launch
| Where | What |
|---|---|
| `public/index.html` – WhatsApp button | Hidden (commented out); add the number in `wa.me/91XXXXXXXXXX` and uncomment |
| `public/index.html` – Contact | Office hours were removed; add them back if the client provides them |
| `public/index.html` – Team bios | Confirm wording with the client |

## Notes
- TFCC title condition: "INTER IDIOT" must be shown **in even letters**. The site renders it in uppercase only, at one size.
- Certificates carry a "For display only" watermark, and the Disclaimer repeats TFCC's "not valid for any other purpose" clause.
- The contact form has client- and server-side validation, a honeypot field and a per-IP rate limit (5 per 15 minutes).
