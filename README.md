# BrowseWise

A static affiliate shopping storefront (HTML/CSS/vanilla JS) with a
lightweight CMS backend built on **Netlify Functions + Netlify Blobs** — no
external database or paid service required. Manage products through an
admin dashboard, or import them straight from an affiliate product URL.

## What's new: the CMS

- **`/admin`** — owner-only dashboard: add, edit, delete, hide/publish, and
  feature products, plus a category manager. Not linked from the storefront
  and marked `noindex`.
- **`/admin/import.html`** — paste a product URL, the system detects the
  platform (Amazon, AliExpress, eBay, CJ, Impact, Awin, or "other"),
  extracts what it safely can, lets you review/edit, optionally runs it
  through AI to generate SEO copy, pros/cons, and an FAQ, then you publish.
- Products now live in **Netlify Blobs** (managed through the Functions API),
  not a manually-edited JSON file. `data/products.json` still exists as a
  **fallback** — if the Functions backend isn't deployed or reachable, the
  storefront automatically falls back to reading it directly, so the site
  never breaks.

### Read this before relying on auto-import

Amazon, eBay, and most large marketplaces **block server-side scraping** and
require their official affiliate APIs (Amazon PA-API, eBay Partner Network,
CJ/Impact/Awin product APIs) for programmatic data — this project does not
include those integrations, since each needs your own approved API
credentials per network. What's built:

- A **generic extractor** that reads Open Graph tags and JSON-LD structured
  data off a product page — works decently for many smaller retailers and
  some AliExpress/eBay listings, and nothing else.
- For Amazon, CJ, and Impact specifically, `extract()` does **not** attempt
  to scrape — it parses what it can from the URL itself (ASIN, wrapped
  destination URL, etc.) and flags the item for manual entry.
- A review screen where every field is editable before anything publishes,
  so a partial or empty auto-extract is never a blocker.
- A modular structure (`/affiliate/*.js`) built so you can drop in an
  official API call for any network without touching the rest of the CMS.

## Setup

### 1. Environment variables

Copy `.env.example` into Netlify (**Site settings → Environment variables**):

| Variable | Required | Purpose |
|---|---|---|
| `ADMIN_PASSWORD` | Yes | Owner login password for `/admin` |
| `ADMIN_SESSION_SECRET` | Recommended | Signs session cookies (falls back to `ADMIN_PASSWORD` if unset) |
| `ANTHROPIC_API_KEY` | Optional | Enables the "Enhance with AI" step in the import wizard |
| `AMAZON_ASSOCIATE_TAG`, `ALIEXPRESS_TRACKING_ID`, `EBAY_CAMPAIGN_ID`, `AWIN_MERCHANT_ID`, `AWIN_AFFILIATE_ID` | Optional | Auto-append your tracking IDs to affiliate links for that network |

None of these are ever exposed to the browser — they're read only inside
Netlify Functions.

### 2. Local development

```bash
npm install
npx netlify-cli dev
```

`netlify dev` runs the static site *and* the Functions/Blobs locally at
`http://localhost:8888`. Opening the HTML files directly (or a plain static
server) will render the storefront using the `data/products.json` fallback,
but `/admin` won't work without the Functions running.

### 3. Deploy to Netlify

1. Push this folder to a Git repository.
2. In Netlify: **New site from Git** → select the repo.
3. Build command: leave blank. Publish directory: `.` (set in `netlify.toml`).
   Netlify auto-detects `netlify/functions` from `netlify.toml`.
4. Set the environment variables above, then deploy.
5. Visit `/admin`, sign in with `ADMIN_PASSWORD`, and add your first product.

## Project structure

```
index.html, products.html, product.html, about.html, contact.html,
privacy.html, affiliate-disclosure.html, 404.html   Public storefront pages
css/style.css                Storefront styling & design tokens
js/app.js                    Nav toggle, dark mode, newsletter/contact UI
js/products.js               Fetches from the CMS API (falls back to data/products.json)
js/search.js                 Homepage/hero search bar → routes to products.html
data/products.json           Fallback catalog if the Functions backend is unreachable
data/products.example.json   Reference schema example

admin/                        Owner-only CMS UI (not linked from storefront)
  index.html                  Login
  dashboard.html               Product list, CRUD, category manager
  import.html                  4-step import wizard
  js/admin-auth.js             Login/session/logout client
  js/admin-api.js              Client for all CMS endpoints
  js/admin-dashboard.js, admin-import.js

netlify/
  functions/                   Serverless API (all admin writes require a valid session)
    admin-login.js, admin-logout.js, admin-session.js
    products.js                 CRUD for products
    categories.js               Category list management
    import-extract.js           Step 1 of import: detect network + extract
    ai-enhance.js                Calls the Anthropic API server-side
    track-click.js, analytics.js Click/conversion tracking
  lib/
    store.js                    Netlify Blobs data-access layer (swap this file to migrate to Supabase/Postgres later)
    auth.js                     Signed-cookie session auth

affiliate/                    One module per network: URL parser, extractor, affiliate-link builder
  amazon.js, aliexpress.js, ebay.js, cj.js, impact.js, awin.js, generic.js, index.js

.env.example                  All environment variables, documented
netlify.toml                  Functions dir, /api alias, headers, 404 fallback
package.json                  Function dependencies (@netlify/blobs, cheerio)
```

## Product schema

```js
{
  id, slug, title, description, shortDescription,
  category, brand, price, oldPrice, image, gallery,
  retailer, affiliateNetwork, originalUrl, affiliateUrl,
  rating, reviews, availability, featured, published,
  seoTitle, seoDescription, keywords, features, pros, cons, faq,
  createdAt, updatedAt
}
```

## Analytics & automated maintenance — structure in place, not automated

`netlify/lib/store.js` includes `trackClick`, `trackConversion`, and
`getAnalytics`, and the dashboard is ready to display them. What's **not**
built yet, on purpose (each needs a decision about which network/API to
integrate against): automatically checking if a product is still available,
re-fetching prices on a schedule, removing discontinued items, or finding
replacements. `trackConversion` is ready to be called from a webhook once you
wire up a specific network's postback URL.

## Built to extend

Swapping `netlify/lib/store.js` for Supabase/Firebase/Postgres later doesn't
require touching any function, the admin UI, or the storefront — they all
go through that one file. The same pattern applies to: product comparisons,
a wishlist, coupons, a blog, real reviews, email marketing, and a fuller
analytics dashboard.
