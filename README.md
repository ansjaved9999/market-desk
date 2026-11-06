# Market Desk

Mobile-friendly market dashboard with Indian and global indices, constituent shares, futures, commodities, Lucknow metals, FII/DII data and USD/INR charts. Includes a home-screen web app manifest and offline application shell.

## Deploy on Render

Upload the contents of this folder to the GitHub repository root. Keep `public` and `tests` as folders. `package.json`, `server.cjs` and `render.yaml` must be at the repository root; do not upload a ZIP or the Windows desktop executable.

Create a Render Web Service from the repository using these settings:

| Setting | Value |
| --- | --- |
| Runtime | Node |
| Branch | main |
| Root Directory | Leave blank |
| Build Command | `npm ci --omit=dev` |
| Start Command | `npm start` |
| Instance Type | Free |
| Health Check Path | `/health` |
| Environment variable | `NODE_VERSION=24.21.0` |

Alternatively, `render.yaml` supplies these settings for a Render Blueprint. The server binds to Render's `PORT` on `0.0.0.0`.

## iPhone

Open the deployed HTTPS URL in Safari, then use Share > Add to Home Screen. Enable Open as Web App if offered. No Mac build or App Store installation is required.

## Data and refresh behavior

Visible index quotes are requested every minute while the app is in the foreground. Open share lists and currency charts refresh every two minutes. Refresh also requests data manually, subject to shared server cache limits. Source timestamps and stale indicators distinguish cached values from fresh quotes. The app does not manufacture price changes between provider updates.

Providers may delay quotes, block requests from hosting servers, or become unavailable. Successful local tests do not verify provider access from Render; check each market after deployment. Offline mode caches only the application shell, never API responses. A bundled dated metals snapshot may appear as stale fallback data. FII/DII historical coverage may use secondary sources labelled in the app.

Free hosting can sleep when idle, so opening the app may take longer while the service wakes. Live data requires internet access and a running backend. Do not use artificial keep-alive traffic to bypass hosting limits. Runtime files are not durable storage; watchlist preferences are saved in the browser on each device.

## Local development

Use Node.js 24, run `npm ci`, then `npm start`. Open `http://localhost:19766`. Run `npm test` for source selection, parsing, static asset and API boundary checks.

No credentials are required by this package. Keep tokens, passwords and `.env` files out of the repository.
