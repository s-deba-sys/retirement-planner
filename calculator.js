// =====================================================================
// Retirement Planner — Financial Engine
// Version 0.2.0
//
// Every function here is a pure function: numbers in, numbers out.
// Nothing in this file touches the DOM. That separation is what lets
// app.js stay a thin "wiring" layer while this file stays testable
// and reusable across every calculator tab.
// =====================================================================

const Finance = {

  // ---------- Inflation ----------

  // What a monthly expense today will cost `years` from now.
  futureExpense(monthlyExpense, inflationPct, years) {
    return monthlyExpense * Math.pow(1 + inflationPct / 100, years);
  },

  annualExpense(monthlyExpense, inflationPct, years) {
    return this.futureExpense(monthlyExpense, inflationPct, years) * 12;
  },

  // ---------- Retirement Corpus (growing annuity, present value) ----------

  // How large a corpus you need at retirement so that an inflation-adjusted
  // withdrawal stream lasts exactly `retirementYears`.
  retirementCorpus(monthlyExpense, inflationPct, yearsToRetirement, returnRatePct, retirementYears) {
    const annual = this.annualExpense(monthlyExpense, inflationPct, yearsToRetirement);
    const r = returnRatePct / 100;
    const g = inflationPct / 100;

    if (Math.abs(r - g) < 1e-6) {
      // Degenerate case: post-retirement return equals inflation exactly.
      return annual * retirementYears;
    }

    return (annual / (r - g)) * (1 - Math.pow((1 + g) / (1 + r), retirementYears));
  },

  // Year-by-year drawdown table for a given corpus, so users can see it
  // actually lasts (or runs out).
  corpusDepletionTable(corpus, monthlyExpense, inflationPct, yearsToRetirement, returnRatePct, retirementYears) {
    const rows = [];
    let balance = corpus;
    let annualWithdrawal = this.annualExpense(monthlyExpense, inflationPct, yearsToRetirement);
    const r = returnRatePct / 100;
    const g = inflationPct / 100;

    for (let year = 1; year <= retirementYears; year++) {
      const openingBalance = balance;
      const growth = openingBalance * r;
      balance = openingBalance + growth - annualWithdrawal;
      rows.push({
        year,
        openingBalance,
        withdrawal: annualWithdrawal,
        growth,
        closingBalance: balance
      });
      annualWithdrawal *= (1 + g);
    }
    return rows;
  },

  // ---------- Existing lump-sum growth ----------

  existingCorpusFV(current, annualReturnPct, years) {
    return current * Math.pow(1 + annualReturnPct / 100, years);
  },

  // ---------- SIP (flat monthly, monthly compounding) ----------

  sipFutureValue(monthly, annualReturnPct, years) {
    const rm = annualReturnPct / 12 / 100;
    const n = years * 12;
    if (rm === 0) return monthly * n;
    return monthly * ((Math.pow(1 + rm, n) - 1) / rm) * (1 + rm);
  },

  // Monthly SIP required to reach a goal corpus.
  requiredSip(goalCorpus, annualReturnPct, years) {
    const rm = annualReturnPct / 12 / 100;
    const n = years * 12;
    if (rm === 0) return goalCorpus / n;
    return goalCorpus / (((Math.pow(1 + rm, n) - 1) / rm) * (1 + rm));
  },

  // ---------- Step-up SIP (monthly contribution rises every year) ----------

  // Computed year-by-year: each year the existing corpus grows at the
  // annual rate, and that year's 12 contributions are added as an
  // ordinary monthly annuity. The contribution itself steps up every year.
  stepUpSipFutureValue(startingMonthly, stepUpPct, annualReturnPct, years) {
    const rm = annualReturnPct / 12 / 100;
    let corpus = 0;
    let monthly = startingMonthly;

    for (let y = 1; y <= years; y++) {
      const fvThisYearContribution = rm === 0
        ? monthly * 12
        : monthly * ((Math.pow(1 + rm, 12) - 1) / rm);
      corpus = corpus * (1 + annualReturnPct / 100) + fvThisYearContribution;
      monthly *= (1 + stepUpPct / 100);
    }
    return corpus;
  },

  stepUpSipYearTable(startingMonthly, stepUpPct, annualReturnPct, years) {
    const rm = annualReturnPct / 12 / 100;
    let corpus = 0;
    let monthly = startingMonthly;
    const rows = [];

    for (let y = 1; y <= years; y++) {
      const fvThisYearContribution = rm === 0
        ? monthly * 12
        : monthly * ((Math.pow(1 + rm, 12) - 1) / rm);
      const openingCorpus = corpus;
      corpus = corpus * (1 + annualReturnPct / 100) + fvThisYearContribution;
      rows.push({
        year: y,
        monthlyContribution: monthly,
        yearlyContribution: monthly * 12,
        openingCorpus,
        closingCorpus: corpus
      });
      monthly *= (1 + stepUpPct / 100);
    }
    return rows;
  },

  // ---------- Goal gap analysis (shared by SIP & Step-up SIP tabs) ----------

  // Inflation-adjusts a goal set in today's rupees, then compares it
  // against a projected corpus.
  goalGap(goalTodayValue, inflationPct, years, projectedCorpus) {
    const inflatedGoal = this.futureExpense(goalTodayValue, inflationPct, years);
    return {
      inflatedGoal,
      projectedCorpus,
      gap: projectedCorpus - inflatedGoal
    };
  },

  // ---------- NPS (National Pension System) ----------

  // employeeMonthly + employerMonthly combine into one contribution stream
  // that steps up every year with `annualIncrementPct` (salary increments
  // typically drive NPS contribution growth). existingCorpus grows
  // independently at the same expected return.
  npsProjection({
    existingCorpus,
    employeeMonthly,
    employerMonthly,
    annualIncrementPct,
    expectedReturnPct,
    yearsToRetirement,
    annuitizationPct = 40,
    annuityRatePct = 6
  }) {
    const combinedMonthly = employeeMonthly + employerMonthly;
    const contributionsFV = this.stepUpSipFutureValue(
      combinedMonthly, annualIncrementPct, expectedReturnPct, yearsToRetirement
    );
    const existingFV = this.existingCorpusFV(existingCorpus, expectedReturnPct, yearsToRetirement);
    const totalCorpus = contributionsFV + existingFV;

    const annuityCorpus = totalCorpus * (annuitizationPct / 100);
    const lumpSum = totalCorpus - annuityCorpus;
    const monthlyPension = (annuityCorpus * annuityRatePct / 100) / 12;

    return { totalCorpus, existingFV, contributionsFV, annuityCorpus, lumpSum, monthlyPension };
  },

  // ---------- Formatting ----------

  // Indian numbering (lakh/crore) currency formatting.
  formatIndian(value) {
    if (!isFinite(value)) return "₹ 0";
    const rounded = Math.round(value);
    const sign = rounded < 0 ? "-" : "";
    return sign + "₹ " + Math.abs(rounded).toLocaleString("en-IN");
  },

  // Compact form for big numbers: ₹7.42 Cr / ₹18.3 L
  formatCompactIndian(value) {
    if (!isFinite(value)) return "₹0";
    const abs = Math.abs(value);
    const sign = value < 0 ? "-" : "";
    if (abs >= 1e7) return sign + "₹" + (abs / 1e7).toFixed(2) + " Cr";
    if (abs >= 1e5) return sign + "₹" + (abs / 1e5).toFixed(2) + " L";
    return sign + "₹" + Math.round(abs).toLocaleString("en-IN");
  }

};

// Node/browser interop (harmless in-browser; enables future unit testing).
if (typeof module !== "undefined" && module.exports) {
  module.exports = Finance;
}
