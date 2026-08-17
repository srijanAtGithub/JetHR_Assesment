/* ============================================
   ITALIAN NET SALARY CALCULATOR — 2026, MILAN
   Permanent, full-time, post-1996 entrant, no CCNL
   ============================================ */

const fmt = (n, decimals = 0) =>
    '€' + n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const fmt2 = (n) => fmt(n, 2);

function calculate(RAL) {
    // ---- Step 1: Monthly Gross ----
    const monthlyGross = RAL / 13;

    // ---- Step 2: INPS (9.19%, capped at €122,295) ----
    const INPS_RATE = 0.0919;
    const INPS_CAP = 122295;
    const inpsBase = Math.min(RAL, INPS_CAP);
    const inps = inpsBase * INPS_RATE;

    // ---- Step 3: Taxable Income ----
    const R = RAL - inps;

    // ---- Step 4: Gross IRPEF (progressive) ----
    let grossIrpef = 0;
    if (R <= 28000) {
        grossIrpef = R * 0.23;
    } else if (R <= 50000) {
        grossIrpef = 28000 * 0.23 + (R - 28000) * 0.33;
    } else {
        grossIrpef = 28000 * 0.23 + 22000 * 0.33 + (R - 50000) * 0.43;
    }

    // ---- Step 5: Standard Employee Tax Credit (Art. 13) ----
    let standardCredit = 0;
    if (R <= 15000) {
        standardCredit = 1955;
    } else if (R <= 28000) {
        standardCredit = 1910 + (1190 * ((28000 - R) / 13000));
    } else if (R <= 50000) {
        standardCredit = 1910 * ((50000 - R) / 22000);
    } else {
        standardCredit = 0;
    }
    // Special bump
    if (R > 25000 && R < 35000) {
        standardCredit += 65;
    }

    // ---- Step 6: Cuneo Fiscale Relief ----
    let cuneoScenario = null; // 'bonus' or 'credit'
    let taxFreeBonus = 0;
    let additionalCredit = 0;

    if (R <= 20000) {
        cuneoScenario = 'bonus';
        if (R <= 8500) {
            taxFreeBonus = R * 0.071;
        } else if (R <= 15000) {
            taxFreeBonus = R * 0.053;
        } else {
            taxFreeBonus = R * 0.048;
        }
    } else {
        cuneoScenario = 'credit';
        if (R <= 32000) {
            additionalCredit = 1000;
        } else if (R <= 40000) {
            additionalCredit = 1000 * ((40000 - R) / 8000);
        } else {
            additionalCredit = 0;
        }
    }

    // ---- Step 7: Net IRPEF ----
    let netIrpef = grossIrpef - standardCredit - additionalCredit;
    if (netIrpef < 0) netIrpef = 0;

    // ---- Step 8: Regional Tax (Lombardia) ----
    let regionalRate;
    if (R <= 15000) regionalRate = 0.0123;
    else if (R <= 28000) regionalRate = 0.0158;
    else if (R <= 50000) regionalRate = 0.0172;
    else regionalRate = 0.0173;
    const regionalTax = R * regionalRate;

    // ---- Step 9: Municipal Tax (Milan) ----
    const municipalTax = R > 23000 ? R * 0.008 : 0;

    // ---- Step 10: Net Annual Income ----
    const netAnnual = RAL - inps - netIrpef - regionalTax - municipalTax + taxFreeBonus;

    // ---- Monthly breakdown ----
    const monthlyInps = inps / 13;
    const irpefPerPayslip = grossIrpef / 13;
    const creditPerMonth = standardCredit / 12;
    const additionalCreditPerMonth = additionalCredit / 12;
    const bonusPerMonth = taxFreeBonus / 12;
    const regionalPerMonth = regionalTax / 11;
    const municipalPerMonth = municipalTax / 11;

    const baseNet = monthlyGross - monthlyInps;

    const netMonths1to11 = baseNet - (irpefPerPayslip - creditPerMonth - additionalCreditPerMonth) - regionalPerMonth - municipalPerMonth + bonusPerMonth;
    const netMonth12 = baseNet - (irpefPerPayslip - creditPerMonth - additionalCreditPerMonth) + bonusPerMonth;
    const netMonth13 = baseNet - irpefPerPayslip;

    const sumOf13 = (netMonths1to11 * 11) + netMonth12 + netMonth13;

    return {
        RAL, monthlyGross, inps, R, grossIrpef, standardCredit,
        cuneoScenario, taxFreeBonus, additionalCredit, netIrpef,
        regionalTax, regionalRate, municipalTax, netAnnual,
        monthlyInps, irpefPerPayslip, creditPerMonth, bonusPerMonth,
        regionalPerMonth, municipalPerMonth,
        netMonths1to11, netMonth12, netMonth13, sumOf13
    };
}

/* ============================================
   RENDERING
   ============================================ */

function render(res) {
    const results = document.getElementById('results');
    const emptyState = document.getElementById('emptyState');
    emptyState.style.display = 'none';
    results.classList.add('visible');

    // Headline
    document.getElementById('netAnnual').textContent = fmt(res.netAnnual);
    document.getElementById('netPercent').textContent =
        `${((res.netAnnual / res.RAL) * 100).toFixed(1)}% of gross RAL`;

    const totalDeducted = res.RAL - res.netAnnual;
    document.getElementById('totalDeductions').textContent = fmt(totalDeducted);
    document.getElementById('effectiveRate').textContent =
        `${((totalDeducted / res.RAL) * 100).toFixed(1)}% effective rate`;

    renderErosionBar(res);
    renderLineItems(res);
    renderBenefits(res);
    renderPayslipStrip(res);
    renderMonthlyCards(res);
    renderReconciliation(res);
}

function renderBenefits(res) {
    const grid = document.getElementById('benefitsGrid');
    const totalEl = document.getElementById('benefitsTotal');
    grid.innerHTML = '';

    const benefits = [];

    // Standard employee tax credit (Art. 13) — always present for eligible incomes
    if (res.standardCredit > 0) {
        benefits.push({
            icon: 'credit',
            name: 'Standard Employee Tax Credit',
            subtitle: 'Detrazioni da lavoro dipendente — Art. 13 TUIR',
            amount: res.standardCredit,
            detail: `Automatically applied against your gross IRPEF because you're a standard employee. Phases out as taxable income rises toward €50,000.`
        });
    }

    // Cuneo fiscale — either a tax-free cash bonus, or an additional credit, never both
    if (res.taxFreeBonus > 0) {
        benefits.push({
            icon: 'bonus',
            name: 'Cuneo Fiscale — Tax-Free Cash Bonus',
            subtitle: 'Paid directly into your salary, not a deduction offset',
            amount: res.taxFreeBonus,
            detail: `Your taxable income is under €20,000, so this relief is paid out as tax-free cash added straight to your net pay each month, rather than reducing tax owed.`,
            highlight: true
        });
    } else if (res.additionalCredit > 0) {
        benefits.push({
            icon: 'credit',
            name: 'Cuneo Fiscale — Additional Tax Credit',
            subtitle: 'Extra relief on top of the standard credit',
            amount: res.additionalCredit,
            detail: `Taxable income between €20,000–€40,000 qualifies for this additional credit, which further reduces the IRPEF you owe.`
        });
    }

    const totalBenefit = res.standardCredit + res.additionalCredit + res.taxFreeBonus;

    if (benefits.length === 0) {
        grid.innerHTML = `<div class="benefit-empty">No tax credits or cuneo fiscale relief apply at this income level — taxable income exceeds the €50,000 threshold for both.</div>`;
        totalEl.innerHTML = '';
        return;
    }

    benefits.forEach(b => {
        const card = document.createElement('div');
        card.className = `benefit-card${b.highlight ? ' highlight' : ''}`;
        card.innerHTML = `
      <div class="benefit-card-top">
        <span class="benefit-icon">${benefitIcon(b.icon)}</span>
        <span class="benefit-amount">+${fmt2(b.amount)}</span>
      </div>
      <div class="benefit-name">${b.name}</div>
      <div class="benefit-subtitle">${b.subtitle}</div>
      <div class="benefit-detail">${b.detail}</div>
    `;
        grid.appendChild(card);
    });

    totalEl.innerHTML = `
    <span class="benefits-total-label">Total tax benefit this year</span>
    <span class="benefits-total-value">${fmt2(totalBenefit)}</span>
  `;
}

function benefitIcon(type) {
    if (type === 'bonus') {
        return `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke="currentColor" stroke-width="1.4"/><path d="M9 5.5V12.5M6.75 7.25C6.75 6.28 7.68 5.5 9 5.5C10.32 5.5 11.25 6.28 11.25 7.25C11.25 8.9 9 8.7 9 10.35C9 11.32 9.93 12.1 9 12.1" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`;
    }
    return `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 5.5C3 4.67 3.67 4 4.5 4H13.5C14.33 4 15 4.67 15 5.5V12.5C15 13.33 14.33 14 13.5 14H4.5C3.67 14 3 13.33 3 12.5V5.5Z" stroke="currentColor" stroke-width="1.4"/><path d="M3 7.5H15" stroke="currentColor" stroke-width="1.4"/><path d="M5.5 10.5H8.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`;
}

function renderErosionBar(res) {
    const bar = document.getElementById('erosionBar');
    bar.innerHTML = '';

    const segments = [
        {
            label: 'INPS', amount: res.inps, color: '#8991A0',
            title: 'INPS — Social Security',
            detail: `9.19% of RAL, capped at €122,295. ${res.RAL > 122295 ? 'Your salary exceeds the cap, so INPS is fixed at the maximum.' : 'Applied directly to your full RAL.'}`
        },
        {
            label: 'Net IRPEF', amount: res.netIrpef, color: 'var(--rust)',
            title: 'IRPEF — National Income Tax',
            detail: `Progressive tax (23% / 33% / 43%) on taxable income, minus your Art. 13 credit (${fmt(res.standardCredit)})${res.additionalCredit > 0 ? ` and cuneo fiscale credit (${fmt(res.additionalCredit)})` : ''}.`
        },
        {
            label: 'Regional', amount: res.regionalTax, color: '#C9836F',
            title: 'Addizionale Regionale — Lombardia',
            detail: `${(res.regionalRate * 100).toFixed(2)}% of taxable income. Paid over 11 monthly installments (Jan–Nov).`
        },
    ];

    if (res.municipalTax > 0) {
        segments.push({
            label: 'Municipal', amount: res.municipalTax, color: '#D9A38C',
            title: 'Addizionale Comunale — Milan',
            detail: `Flat 0.8% of taxable income, since it exceeds the €23,000 exemption threshold. Paid over 11 installments.`
        });
    }

    segments.push({
        label: 'Net pay', amount: res.netAnnual, color: 'var(--sage)',
        title: 'What you keep',
        detail: `Your final net annual income${res.taxFreeBonus > 0 ? `, including the tax-free cuneo fiscale bonus of ${fmt(res.taxFreeBonus)}` : ''}.`
    });

    document.getElementById('scaleTop').textContent = fmt(res.RAL);
    document.getElementById('scaleBottom').textContent = '€0';

    segments.forEach(seg => {
        const pct = (seg.amount / res.RAL) * 100;
        const el = document.createElement('div');
        el.className = 'erosion-segment';
        el.style.width = `${pct}%`;
        el.style.background = seg.color;
        el.innerHTML = `
      <span class="seg-label">${pct > 6 ? seg.label : ''}</span>
      <div class="erosion-tooltip">
        <span class="tt-title">${seg.title}</span>
        ${seg.detail}<br><span class="tt-amount">${fmt2(seg.amount)}</span>
      </div>
    `;
        bar.appendChild(el);
    });
}

function renderLineItems(res) {
    const table = document.getElementById('lineItemsTable');
    table.innerHTML = '';

    const items = [
        {
            color: '#8991A0', name: 'INPS — Social Security Contribution', amount: res.inps,
            detail: `9.19% of ${res.RAL > 122295 ? 'the €122,295 contributive cap' : 'your RAL'}.`,
            formula: res.RAL > 122295 ? '€122,295 × 9.19%' : `${fmt(res.RAL)} × 9.19%`
        },
        {
            color: 'var(--rust)', name: 'IRPEF — National Income Tax (net)', amount: res.netIrpef,
            detail: `Gross IRPEF of ${fmt2(res.grossIrpef)} on your taxable income of ${fmt2(res.R)}, reduced by the standard employee credit (${fmt2(res.standardCredit)})${res.additionalCredit > 0 ? ` and the cuneo fiscale credit (${fmt2(res.additionalCredit)})` : ''}.`,
            formula: 'Progressive: 23% to €28k · 33% to €50k · 43% above'
        },
        {
            color: '#C9836F', name: 'Addizionale Regionale (Lombardia)', amount: res.regionalTax,
            detail: `Regional surtax at ${(res.regionalRate * 100).toFixed(2)}%, the bracket for your taxable income level. Deducted over 11 months.`,
            formula: `${fmt2(res.R)} × ${(res.regionalRate * 100).toFixed(2)}%`
        },
    ];

    if (res.municipalTax > 0) {
        items.push({
            color: '#D9A38C', name: 'Addizionale Comunale (Milan)', amount: res.municipalTax,
            detail: `Flat municipal surtax — your taxable income is above the €23,000 exemption threshold. Deducted over 11 months.`,
            formula: `${fmt2(res.R)} × 0.8%`
        });
    } else {
        items.push({
            color: '#D9A38C', name: 'Addizionale Comunale (Milan)', amount: 0,
            detail: `Waived — your taxable income of ${fmt2(res.R)} falls at or below the €23,000 exemption threshold.`,
            formula: 'Exempt'
        });
    }

    if (res.taxFreeBonus > 0) {
        items.push({
            color: 'var(--sage)', name: 'Cuneo Fiscale — Tax-Free Bonus', amount: -res.taxFreeBonus,
            detail: `Your taxable income is under €20,000, so the wedge relief arrives as a tax-free cash bonus added to your pay, rather than a tax credit.`,
            formula: `${fmt(res.RAL)} × ${res.R <= 8500 ? '7.1%' : res.R <= 15000 ? '5.3%' : '4.8%'}`
        });
    } else if (res.additionalCredit > 0) {
        items.push({
            color: 'var(--sage)', name: 'Cuneo Fiscale — Additional Tax Credit', amount: -res.additionalCredit,
            detail: `Already netted into the IRPEF line above — shown separately to make the relief visible. Reduces Gross IRPEF directly.`,
            formula: res.R <= 32000 ? 'Flat €1,000 credit' : `€1,000 × ((40,000 − ${Math.round(res.R)}) / 8,000)`
        });
    }

    items.forEach(item => {
        const isPositive = item.amount < 0;
        const row = document.createElement('div');
        row.className = 'lineitem';
        row.innerHTML = `
      <span class="lineitem-dot" style="background:${item.color}"></span>
      <div class="lineitem-body">
        <div class="lineitem-name">${item.name}</div>
        <div class="lineitem-detail">${item.detail}<br><span class="formula">${item.formula}</span></div>
      </div>
      <span class="lineitem-amount ${isPositive ? 'positive' : ''}">${isPositive ? '+' : '−'}${fmt2(Math.abs(item.amount))}</span>
    `;
        table.appendChild(row);
    });
}

function renderPayslipStrip(res) {
    const strip = document.getElementById('payslipStrip');
    strip.innerHTML = '';
    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', '13th'];
    const values = [
        ...Array(11).fill(res.netMonths1to11),
        res.netMonth12,
        res.netMonth13
    ];
    const types = [...Array(11).fill('type-standard'), 'type-dec', 'type-thirteenth'];

    labels.forEach((label, i) => {
        const block = document.createElement('div');
        block.className = `payslip-block ${types[i]}`;
        block.innerHTML = `
      ${label}
      <div class="erosion-tooltip">
        <span class="tt-title">${label === '13th' ? 'Tredicesima' : label}</span>
        Net pay: <span class="tt-amount">${fmt2(values[i])}</span>
      </div>
    `;
        strip.appendChild(block);
    });
}

function renderMonthlyCards(res) {
    const container = document.getElementById('monthlyCards');
    container.innerHTML = `
    <div class="month-card">
      <div class="month-card-header">
        <span class="month-card-swatch" style="background:var(--sage)"></span>
        <span class="month-card-title">Months 1–11 (Jan–Nov)</span>
      </div>
      <div class="month-card-value">${fmt2(res.netMonths1to11)}</div>
      <div class="month-card-note">Full local tax installment deducted (1/11), plus 1/12 of your annual tax credit${res.taxFreeBonus > 0 ? ' and cuneo bonus' : ''}.</div>
    </div>
    <div class="month-card">
      <div class="month-card-header">
        <span class="month-card-swatch" style="background:#6B9A8C"></span>
        <span class="month-card-title">Month 12 (December)</span>
      </div>
      <div class="month-card-value">${fmt2(res.netMonth12)}</div>
      <div class="month-card-note">Regional and municipal installments are already paid off — no local tax this month. Tax credit still applies. (Year-end conguaglio not modeled.)</div>
    </div>
    <div class="month-card">
      <div class="month-card-header">
        <span class="month-card-swatch" style="background:var(--rust)"></span>
        <span class="month-card-title">13th Payslip (Tredicesima)</span>
      </div>
      <div class="month-card-value">${fmt2(res.netMonth13)}</div>
      <div class="month-card-note">No tax credits, no cuneo bonus, no local tax — but full marginal IRPEF applies. The most heavily taxed payslip of the year.</div>
    </div>
  `;
}

function renderReconciliation(res) {
    const diff = Math.abs(res.netAnnual - res.sumOf13);
    document.getElementById('reconciliation').innerHTML = `
    <span class="recon-label">Net annual (top-down): <strong style="color:var(--ink)">${fmt2(res.netAnnual)}</strong> · Sum of 13 payslips (bottom-up): <strong style="color:var(--ink)">${fmt2(res.sumOf13)}</strong></span>
    <span class="recon-check">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.3"/><path d="M4.5 7L6.2 8.8L9.5 5.2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
      Reconciled — within €${diff.toFixed(2)} (rounding only)
    </span>
  `;
}

/* ============================================
   EVENT WIRING
   ============================================ */

const ralInput = document.getElementById('ralInput');
const calculateBtn = document.getElementById('calculateBtn');

function parseRAL() {
    const raw = ralInput.value.replace(/[^\d]/g, '');
    return raw ? parseInt(raw, 10) : 0;
}

function formatInputValue(val) {
    return val ? Number(val).toLocaleString('en-US') : '';
}

ralInput.value = '45,000';

ralInput.addEventListener('input', () => {
    const val = parseRAL();
    ralInput.value = formatInputValue(val);
});

function runCalculation() {
    const RAL = parseRAL();
    if (!RAL || RAL <= 0) {
        ralInput.focus();
        return;
    }
    const res = calculate(RAL);
    render(res);
}

calculateBtn.addEventListener('click', runCalculation);
ralInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') runCalculation();
});

// Run once on load with default value for a populated first impression
window.addEventListener('DOMContentLoaded', () => {
    runCalculation();
});