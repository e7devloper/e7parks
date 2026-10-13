# Product

<!-- impeccable:product-schema 1 -->

> Written without an interview, at the owner's instruction to proceed. Facts marked *(inferred)* come from the
> original build brief and the public site e7entertainments.com and have not been confirmed by the owner.

## Platform

adaptive

## Users

People who want a leisure venue built and are approaching E7 Entertainments to do it: landowners, property
developers, mall and resort operators, municipal and government bodies *(inferred from the site's product and
government-projects sections)*. They open the app with a project in mind and a rough budget, usually on a phone,
often for the first time and without knowing E7's process.

## Product Purpose

Let a prospective client raise a park project request in a few minutes and know it reached E7. A request becomes a
ticket on E7's internal dashboard, and the client gets an email confirming exactly what they submitted. Success is a
complete, quotable request and a client who trusts someone will call them back.

## Positioning

E7 builds the parks itself: amusement, theme, water and dinosaur parks, playgrounds and game zones, delivered across
Asia, Africa, the Middle East and Europe *(from the site)*. The app is the front door to that team, not a
marketplace or a catalogue.

## Operating Context

- Sign up with name, email, phone and password; the email is verified with a 6-digit one-time code.
- Raise a request: one park type, budget and currency, location, optional site area and expected daily visitors,
  timeline, preferred contact method, free-text notes.
- Sending raises a ticket with a reference such as `E7-20261013-068128`, visible to staff at `/internal`.
- Staff move a ticket through Open → In review → Quoted → Closed; the client sees the status in the app.

## Capabilities and Constraints

- Expo SDK 57 + React Native, must run in Expo Go (no custom native modules).
- Backend is the Node/Express server in `../server`; ticket fields and option lists are mirrored in
  `src/lib/catalog.ts` and `server/src/catalog.js`.
- A request has exactly one park type.
- Currencies offered: INR, USD, AED, EUR. Default INR.
- Undecided: SMS OTP instead of email; whether clients can edit or withdraw a ticket; attachments (site photos, plans).

## Brand Commitments

- Name: E7 Entertainments (app: E7 Parks).
- Logo: the gradient "E7" mark with ferris wheel, bunting and film strip, `assets/logo.png`, taken from the site.
- Colours and type follow e7entertainments.com (owner instruction): navy ink `#1f3864`, gold `#f0a821`,
  pale ground `#f4f7fb`, Montserrat for display.

## Evidence on Hand

- Logo artwork from the site. No park photography, case studies, client names or testimonials are in the project;
  none may be invented.

## Product Principles

1. The request must be finishable in one sitting; ask only what a quote needs.
2. The client should always know what happens next and that their ticket exists.
3. It should feel like the company that builds parks, without getting in the way of a form.
4. Never imply prices, timelines or commitments E7 has not made.

## Accessibility & Inclusion

WCAG AA contrast, platform text scaling honoured, touch targets at least 44pt (iOS) / 48dp (Android).
