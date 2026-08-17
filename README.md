# Busta Paga — Italian Net Salary Calculator (Milan, 2026)

A single-page, client-side calculator that converts an Italian gross annual
salary (**RAL** — Retribuzione Annua Lorda) into net take-home pay, broken
down payslip by payslip. Built for a permanent, full-time, Milan-based
employee under 2026 tax rules.

No backend, no build step — open `index.html` in a browser.

---

## What it does

Given a single input (annual RAL), the calculator:

- Runs the gross salary through Italy's 2026 payroll deduction chain: INPS
  social security, progressive IRPEF income tax, regional surtax
  (Lombardia), and municipal surtax (Milan).
- Applies the tax relief an employee is entitled to: the standard employee
  tax credit (Art. 13 TUIR) and the *cuneo fiscale* relief, which is either a
  tax-free cash bonus or an additional tax credit depending on income.
- Shows the full year at a glance — an "erosion bar" visualizing where each
  euro of RAL goes — and an itemized line-by-line breakdown.
- Splits the annual figure into **13 monthly payslips** (standard for
  Italian permanent contracts with no CCNL-mandated 14th), accounting for:
  - Regional/municipal tax only being withheld over 11 installments
    (Jan–Nov), not 13.
  - The 13th payslip (*tredicesima*) receiving no tax credits and no local
    tax, since Italian payroll doesn't apply them to that installment.
  - A **December conguaglio (year-end reconciliation)**: since credits are
    spread evenly across 12 months but the 13th payslip gets none, the sum
    of all 13 payslips can drift from the true annual net — most visibly at
    low incomes, where credits fully offset IRPEF (*incapienza fiscale*).
    December absorbs that difference as a refund or a collection, exactly
    as real Italian payroll does, so the 13 payslips always add up exactly
    to the annual net.
- Lets the user tap any deduction, credit, or bonus to see the **generic
  formula** behind it — not tied to their specific salary — explained in
  plain language, so the "why" behind each number is transparent.

---

## Project structure

```
index.html      — page structure, input panel, output panel, formula modal
styles.css      — all styling (design tokens, layout, components, modal)
calculator.js   — tax logic (calculate()) + all DOM rendering
```

Everything is vanilla HTML/CSS/JS. No frameworks, no dependencies, no
package manager — it's a static site.

---

## Core calculation logic (`calculate(RAL)`)

All figures derive from a single taxable income base, **R = RAL − INPS**:

| Step | Rule |
|---|---|
| INPS | 9.19% of RAL, capped at €122,295 (post-1996 contributive regime) |
| IRPEF (gross) | Progressive: 23% to €28k · 33% €28k–€50k · 43% above |
| Standard employee credit (Art. 13 TUIR) | Phases from €1,955 down to €0 as R rises to €50k, plus a €65 bump between €25k–€35k |
| Cuneo fiscale | R ≤ €20k → tax-free cash bonus (7.1% / 5.3% / 4.8% by band); R €20k–€40k → additional credit up to €1,000 |
| Regional surtax (Lombardia) | 1.23%–1.73% of R, by bracket |
| Municipal surtax (Milan) | Flat 0.8% of R, only if R > €23,000 |
| Net annual | RAL − INPS − net IRPEF − regional − municipal + tax-free bonus |

Monthly figures split credits/bonus over 12 months, local taxes over 11
months, and the 13th payslip separately — then the December conguaglio
adjustment is calculated as `netAnnual − sum of the other 12 payslips`,
guaranteeing the 13-payslip sum always reconciles exactly to the annual
net.

---

## Assumptions / scope

This is a simplified model of a **single standard case**, not a general
Italian payroll engine:

- Permanent, full-time employee, corporate/tech sector
- Entered the workforce after 1996 (INPS contributive cap applies)
- Resident and working in Milan, Lombardia
- Paid over 13 installments (no 14th)
- No CCNL — so no supplementary health fund deduction
- Full 365-day tax year, no special exemptions or bonuses
- Not in their first year of Italian residency (regional tax applies)

It should **not** be used as a substitute for a commercialista or official
payslip — it's a working prototype for understanding the shape of Italian
payroll deductions, not a compliance tool.

---

## UI notes

- **Erosion bar**: proportional visualization of RAL split into INPS /
  IRPEF / regional / municipal / net pay, each segment tappable for its
  formula.
- **Line items table**: itemized deductions with the specific numbers used
  for *this* salary.
- **Benefits section**: tax credits and cuneo fiscale, shown separately
  from deductions since they add back rather than subtract.
- **Payslip strip + monthly cards**: the 13-installment view, including the
  December conguaglio line when it applies.
- **Formula modal**: tapping the small "i" icon on any deduction/credit/
  bonus/conguaglio row opens a modal with the generic formula and a plain
  explanation — no citation links, no salary-specific numbers.

---

## Known limitations

- Year-end conguaglio here only models the credit/tredicesima mismatch —
  it doesn't account for mid-year raises, bonuses, or multiple employers.
- No support for part-time, fixed-term, or 14-installment CCNL contracts.
- No handling for dependents, additional deductions (oneri detraibili), or
  regions/municipalities other than Lombardia/Milan.
- Figures are rounded for display; internal math uses full floating-point
  precision.

---

## Rates reference (2026)

All rates are current as of the 2026 Legge di Bilancio (L. 199/2025):

- IRPEF brackets: 23% / 33% / 43% (33% bracket reduced from 35% for 2026)
- INPS employee rate: 9.19%, contributive cap €122,295
- Standard employee credit: Art. 13 TUIR
- Cuneo fiscale thresholds: €20,000 / €40,000