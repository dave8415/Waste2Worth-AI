---
name: Measurement and emissions trust
description: User requirements that keep photo observations, measured quality, physical quantities and provisional emissions distinct.
---

Biomass photos may describe apparent condition but never establish numeric moisture, calorific value, ash content or certified quality grades. Numeric quality must come from user-entered measurements with provenance and dates; unavailable is not zero. Reading printed COA values is different from inferring quality from biomass, and any such extraction must be reviewed and confirmed before saving.

**Why:** The user explicitly requires measured data to remain separate from Gemini's visual classification.

Keep test-result editing off Scan so identification leads directly to Offer. Offers must work without tests. Test results belong in one default-collapsed Market material-detail section, with a shared source, test date and evidence file rather than repeating provenance for each value. Reports keep measured results distinct from photo observations.

**Why:** The user found the expanded Scan forms too large and said they interrupted the Scan → Offer flow.

Offered, collected, received and reused quantities are distinct. Transaction completion is not evidence of reuse. Explicitly linked receipt data must not silently become a claim of a verified sale or verified impact.

**Why:** The app is a focused, unverified prototype, not a certification or carbon-credit system.

Only the biomass-fuel emissions route is defined for now. Require documented baseline displacement, emission factors, project inventory, sources, assumptions and compatible wet/dry bases. Never substitute a fixed biomass-tonnage multiplier or silently treat missing emissions as zero. Biochar and compost need separate methodologies. All estimates remain preliminary, not verified carbon credits; no automatic credit pricing.

**Why:** The user requested transparent provisional calculations without invented savings or unsupported carbon-credit claims.

**How to apply:** Preserve these distinctions in future forms, AI prompts, matching logic and PDF/report exports. Changes to linked quantities, measured quality or assumptions must invalidate old reports, while their historical inputs remain traceable.
