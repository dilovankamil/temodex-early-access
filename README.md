# Temodex Early Access Program

Interactive development model for production-site receipts from Temodex supply. Derived from the SI-053 Strategic Model, with Mexico and glioblastoma selected initially.

## Model

- Eligible patients = population × incidence per 100,000 ÷ 100,000 × accessible-population share × surgical eligibility.
- Supplied patients = eligible patients × production share.
- Products = supplied patients × products per patient (initially 1).
- COGS reimbursement = products × cost of goods per product.
- Overhead = COGS reimbursement × overhead markup percentage.
- Total site payment = COGS reimbursement + overhead.
- Optional annual scale-up compounds the production share, capped at 100% of eligible patients. Population growth is inherited from the original model.

The model uses eligible patients directly. It does not apply the SI-053 commercial price, market-penetration ramp, regulatory launch dates, probability adjustment, tax, valuation, or patent-expiry erosion. The first supply year is an editable planning assumption, not a regulatory forecast. All countries and selected indications use the same production share and supply start year.

Patient assumptions reproduce the original model's population, incidence, access and surgery calculations. Mexico and many other country inputs are inherited planning proxies, not validated Temodex estimates. Other primary brain tumors use the original placeholder incidence. Incidence and surgery eligibility can be edited separately for each selected indication and focused country.

Initial values are illustrative: $500 COGS per product, 20% overhead markup, 0.1% patient share, zero annual scale-up, and a 2027–2036 horizon. Overhead is a markup on COGS, not margin on selling price or net profit. Products are rounded to the nearest whole unit per country and year before COGS, overhead and payment are calculated. Total products sum those country quantities.

## Interface

- Flat country list, search, add/remove, and map selection; no region controls.
- Neutral globe with selected countries highlighted. Adding a country centers the globe on it without deselecting prior countries. Drag and zoom remain available; no automatic spin.
- Yearly stacked COGS/overhead chart and country subtotals. Select a year in the chart or year selector.
- Optional glioblastoma, brain-metastasis and other-primary-brain-tumor inputs.
- Patient assumptions are collapsed until needed. A focused country's inputs can be edited independently.
- CSV export includes all forecast years, country rows, yearly totals and global production settings.
- Changes stay in memory and reset on reload; no inputs are uploaded to a server.

## Development

```sh
npm ci
npm test
npm run dev -- --host 127.0.0.1
```

```sh
npm run build
npm run preview -- --host 127.0.0.1
```

## Deployment

The Vite build uses relative asset paths so it works under `/temodex-early-access/` or a custom domain. In repository Settings → Pages, choose **GitHub Actions** as the source. The included workflow runs calculation tests, builds the app and deploys `dist` on pushes to `main`.

The original `market-revenue-model` repository is separate and unchanged.
