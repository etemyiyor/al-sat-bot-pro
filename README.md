# AL-SAT BOT PRO

Responsive market-analysis web app for PC and mobile. Existing terminal UI is preserved.

## Current features
- Crypto / BIST / US market lists and existing quote/chart integrations.
- Technical analysis and paper-trading screens.
- News feed extension and AI analysis panel.
- Account registration/login and admin UI extensions.
- Cloudflare Workers + D1 API source in `backend/`.

## Important setup
The web UI and API code are committed, but account login and AI analysis require deploying the backend and configuring it first. Follow [backend setup instructions](backend/README.md), configure `ALLOWED_ORIGINS`, and set the Worker secrets `AUTH_SECRET` and `AI_API_KEY`. Then open the app's **Hesap** page and enter the deployed Worker HTTPS URL.

The first admin must be promoted manually in D1 after registering. Public registration never grants admin permissions.

## Safety and data
- Real exchange orders are not sent by this app; use paper/demo trading only.
- Market data depends on the source, network availability and provider plan.
- BIST prices may be delayed or unavailable depending on the configured data provider.
- AI output is informational and is not personalized financial advice.
- Do not put API secrets in frontend JavaScript.
