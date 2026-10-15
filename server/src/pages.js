// Public pages the App Store and Google Play listings link to: the privacy policy and a way to
// delete an account without installing the app.
const express = require('express');
const { checkCredentials, deleteAccount, limiter } = require('./auth');
const { esc } = require('./mailer');

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL;
const POLICY_UPDATED = '13 October 2026';

const contact = SUPPORT_EMAIL
  ? `<a href="mailto:${esc(SUPPORT_EMAIL)}">${esc(SUPPORT_EMAIL)}</a>`
  : '<a href="https://e7entertainments.com/contact">e7entertainments.com/contact</a>';

const page = (title, body) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · E7 Parks</title>
<style>
  body{font:16px/1.6 system-ui,sans-serif;margin:0;background:#f4f7fb;color:#3d4c5e}
  header{background:#1f3864;color:#fff;padding:16px 24px;font-weight:700}
  main{max-width:680px;margin:0 auto;padding:24px}
  h1{font-size:26px;line-height:1.25;color:#1f3864;margin:8px 0}h2{font-size:18px;color:#1f3864;margin:28px 0 4px}
  a{color:#1f3864}small,.muted{color:#5a6a80}
  label{display:block;font-weight:600;color:#1f3864;margin:16px 0 6px}
  input{font:inherit;width:100%;box-sizing:border-box;padding:12px 14px;border:1px solid #7f8ea5;border-radius:12px;background:#fff}
  button{font:inherit;font-weight:700;margin-top:24px;padding:14px 20px;border:0;border-radius:12px;background:#a8201a;color:#fff;cursor:pointer}
  .box{padding:12px 14px;border-radius:12px;margin:16px 0}.error{background:#fcebea;color:#a8201a}.done{background:#ddf3e6;color:#14613a}
</style></head><body>
<header>E7 Entertainments · E7 Parks</header>
<main>${body}</main></body></html>`;

const router = express.Router();

router.get('/privacy', (_req, res) => {
  res.type('html').send(
    page(
      'Privacy policy',
      `<h1>Privacy policy</h1>
<p class="muted">Last updated ${POLICY_UPDATED}</p>
<p>E7 Parks is the app E7 Entertainments uses to receive park project requests. This policy explains what the app
and its service collect, why, and the choices you have.</p>

<h2>What we collect</h2>
<ul>
  <li><b>Account details you give us:</b> your name, email address, phone number and a password. The password is
  stored only as a one-way hash; we cannot read it.</li>
  <li><b>Requests you raise:</b> the park type, budget and currency, location, site area, expected daily visitors,
  timeline, preferred contact method and anything you write under additional information.</li>
  <li><b>Verification codes:</b> a one-time code is emailed to you when you sign up. It is stored as a hash and
  deleted once used.</li>
</ul>
<p>The app does not collect your precise location, contacts, photos, device identifiers or advertising IDs. It contains
no advertising and no third-party analytics or tracking. A sign-in token is kept in your device's secure storage so
you stay logged in; it is removed when you log out or delete your account.</p>

<h2>How we use it</h2>
<ul>
  <li>To create your account, verify your email address and sign you in.</li>
  <li>To review your request, prepare a plan and quote, and contact you about it by email, phone or WhatsApp,
  whichever you chose.</li>
  <li>To email you a copy of each request you send.</li>
  <li>To keep the service secure, for example by limiting repeated sign-in attempts.</li>
</ul>
<p>We do not sell your information or use it for advertising.</p>

<h2>Who sees it</h2>
<p>Your details and requests are seen by E7 Entertainments staff who handle enquiries, and may be copied into E7's
internal sales and project systems. They are processed on our behalf by the companies that host the service and deliver
our email. We may disclose information where the law requires it.</p>

<h2>How long we keep it</h2>
<p>We keep your account and requests until you delete your account. An account that is never verified holds only the
details entered at sign-up.</p>

<h2>Deleting your account</h2>
<p>You can delete your account at any time, either in the app under <b>Account → Delete account</b> or on the
<a href="/delete-account">account deletion page</a>. Deleting removes your account details and every request raised with
it from the service. Emails already sent to you, and anything E7 is legally required to retain, are not affected.</p>

<h2>Your choices</h2>
<p>You can ask for a copy of your information, or for it to be corrected, by contacting us. Depending on where you live
you may have further rights under local data protection law.</p>

<h2>Children</h2>
<p>E7 Parks is a business service for adults planning a project. It is not directed at children and we do not knowingly
collect information from them.</p>

<h2>Changes</h2>
<p>If this policy changes we will update this page and the date above.</p>

<h2>Contact</h2>
<p>Questions about this policy or your information: ${contact}.</p>`
    )
  );
});

const deleteForm = (error) =>
  page(
    'Delete your account',
    `<h1>Delete your E7 Parks account</h1>
<p>This permanently deletes your account: your name, email address, phone number, password, and every request you have
raised, including any the E7 team is still working on. It cannot be undone.</p>
<p class="muted">You can also do this in the app under Account → Delete account.</p>
${error ? `<div class="box error" role="alert">${esc(error)}</div>` : ''}
<form method="post" action="/delete-account">
  <label for="email">Email</label><input id="email" name="email" type="email" autocomplete="username" required>
  <label for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" required>
  <button>Delete my account</button>
</form>
<p><small>Can't sign in? Contact us at ${contact} from the email address on the account and we will delete it for you.</small></p>`
  );

router.get('/delete-account', (_req, res) => res.type('html').send(deleteForm()));

router.post('/delete-account', limiter, express.urlencoded({ extended: false }), async (req, res) => {
  const user = await checkCredentials(req.body?.email, req.body?.password);
  if (!user) return res.status(401).type('html').send(deleteForm('Incorrect email or password.'));
  await deleteAccount(user);
  res.type('html').send(
    page(
      'Account deleted',
      `<h1>Account deleted</h1><div class="box done">Your E7 Parks account and the requests raised with it have been deleted.</div>`
    )
  );
});

module.exports = { router };
