# Voice

PlainLedger talks to owners of Canadian small and mid-sized businesses: restaurants, contractors, clinics, landlords and agencies. It also talks to the CPAs who keep their books. Owners know their business better than their accounting. Write so an owner can act on a number without calling their accountant, and so the accountant would sign off on the wording.

## Tone

- **Plain.** Name the number, what it means, and what to do next. "Food cost ran 3 points above plan in August. Produce and dairy account for most of the gap."
- **Specific.** Use the business's own units: Food Cost %, RevPAR, Cap Rate, days sales outstanding. The product ships KPIs for 15+ industries, so use them.
- **Calm.** Money is stressful. No alarms, exclamation marks or hype. An anomaly is "worth a look", not an emergency.
- **Canadian.** Say where the data lives ("Data stored in Canada", "PIPEDA compliant") and name Canadian programs as they are named: SR&ED (RS&DE in French), CDAE, Montage financier.

## The lines we already use

- No surprises, just numbers.
- Know your numbers. Grow your business.
- Financial reporting, simplified. / Rapports financiers, simplifiés.
- Connect QuickBooks in 5 minutes.
- No commitment. No surprises.

## Person and naming

- Speak to the reader as **you** and **your business**. PlainLedger says **we** sparingly, mostly in emails ("We received a request to reset your PlainLedger password.").
- Emails open with "Hi {name}," and sign off "The PlainLedger Team".
- The AI assistant is **James**. James speaks in the first person and says where a number came from.
- Write **PlainLedger** as one word with two capitals. Never "Plain Ledger", "PL" or "plainledger" in copy. The domain is plainledger.ca.

## Casing and punctuation

- Use sentence case for buttons, labels, tabs and headings: "Get started free", "Connect QuickBooks", "Anomaly detection". Some older landing copy uses Title Case ("Financial Reporting, Simplified."); change it when you touch it.
- Button text is a verb and names the result: "Save", "Export PDF", "Connect QuickBooks". Loading states say what is happening: "Loading...", "Syncing QuickBooks...".
- Write IBCS codes exactly: AC, PL, FC, PY, ΔPL, ΔPL%, ΔPY, ΔPY%.
- No emoji in the product. Industry and feature icons are Lucide glyphs "instead of emojis for consistent theming", as the code says.

## Numbers, money and dates

- Format money with `formatCurrency()`: Canadian dollars with no cents on dashboards. English writes `$47,500` and French writes `47 500 $`.
- Format with `formatNumber()`, `formatPercent()` and `formatDate()`. They follow the reader's language (`en-CA` or `fr-CA`). Never concatenate numbers into strings by hand.
- Show the sign on every variance: `+12%`, `−3%`. A variance without a sign is ambiguous.
- Round to what the decision needs. A KPI tile shows `$128K`; the statement shows `$128,450`.

## Two languages

- Every string has an `en` and an `fr` entry in `lib/i18n/translations.ts`, or an `{ en, fr }` object beside the component. English is the default and French is first-class.
- French copy runs about 20% longer. Leave room, and let labels wrap rather than truncate.
- Use the product's terms consistently:

| English                 | Français                       |
| ----------------------- | ------------------------------ |
| Actual                  | Réel                           |
| Plan                    | Plan                           |
| Forecast                | Prévision                      |
| Prior year              | Année précédente (Année préc.) |
| Variance                | Écart                          |
| Favorable / Unfavorable | Favorable / Défavorable        |
| On target               | Dans la cible                  |
| Settings                | Paramètres                     |
| Organization            | Organisation                   |
| Subscription            | Abonnement                     |

## Do and don't

| Do                                           | Don't                                 |
| -------------------------------------------- | ------------------------------------- |
| Food cost is 3.2 points above plan.          | Uh-oh! Your costs are out of control! |
| Connect QuickBooks to see your real numbers. | No data.                              |
| Last synced 4 minutes ago                    | Sync status: OK (lastSync=240s)       |
| Export PDF                                   | Click here to export                  |
| Data stored in Canada                        | 100% secure                           |
