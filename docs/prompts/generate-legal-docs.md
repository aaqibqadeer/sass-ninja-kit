# Prompt — Generate Filled-In Legal Docs

Turns the `[PLACEHOLDER]` templates in `docs/legal-templates/` into finished
Privacy Policy, Terms of Service, and Cookie Policy documents for a specific
product. Copy the block below, fill in the **Inputs**, and paste it into a
capable LLM.

> ⚠️ AI output is a **starting draft, not legal advice**. Have a qualified lawyer
> review before publishing, especially the liability, governing-law, refund, and
> data-transfer sections.

---

```
You are a careful legal-writing assistant. Using the three Markdown templates
below (Privacy Policy, Terms of Service, Cookie Policy), produce finished
documents for my product by replacing every [PLACEHOLDER] with the correct value
from the Inputs. Rules:

- Replace EVERY [PLACEHOLDER]. If an input is missing, insert a clearly marked
  «TODO: …» note instead of inventing facts — never fabricate a company address,
  jurisdiction, or contact email.
- Keep the section structure and headings intact. Adjust wording only where an
  input requires it (e.g. remove the marketing-cookies row if there are none).
- Match the tone to the jurisdiction's norms; if GDPR/UK GDPR applies, keep the
  legal-bases and data-rights sections.
- Output three separate fenced Markdown documents, in this order: privacy-policy,
  terms-of-service, cookie-policy.

Inputs:
- Product name: [PRODUCT_NAME]
- Product URL: [PRODUCT_URL]
- Company legal name: [COMPANY_LEGAL_NAME]
- Company address: [COMPANY_ADDRESS]
- Jurisdiction / governing law: [GOVERNING_LAW_JURISDICTION]
- Privacy contact email: [PRIVACY_CONTACT_EMAIL]
- Legal contact email: [LEGAL_CONTACT_EMAIL]
- Effective date: [EFFECTIVE_DATE]
- What the product does (1–3 sentences): [PRODUCT_DESCRIPTION]
- Data collected: [DATA_CATEGORIES]
- Sub-processors (hosting, email, payments, analytics): [SUBPROCESSORS]
- Payment processor: [PAYMENT_PROCESSOR]
- Billing cadence + refund policy: [BILLING_AND_REFUNDS]
- Free trial length (or "none"): [TRIAL_LENGTH]
- Analytics/marketing cookies (or "none"): [COOKIE_DETAILS]
- Minimum age: [MINIMUM_AGE]
- Data retention period: [RETENTION_PERIOD]

Templates:
--- PRIVACY POLICY ---
{paste docs/legal-templates/privacy-policy.md}
--- TERMS OF SERVICE ---
{paste docs/legal-templates/terms-of-service.md}
--- COOKIE POLICY ---
{paste docs/legal-templates/cookie-policy.md}
```

---

After generating, wire the docs into the app if you want them routed (e.g.
`app/(legal)/privacy/page.tsx`), and pass the routed path to
`<CookieBanner policyHref="/cookie-policy" />` so the banner links to it.
