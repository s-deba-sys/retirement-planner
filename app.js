// =====================================================================
// Nivesh — Retirement Planner
// app.js — reads inputs, calls Finance (calculator.js), updates the page.
// No financial formulas live here; see calculator.js for those.
// =====================================================================

let portfolioChart = null;

document.addEventListener("DOMContentLoaded", () => {
  initializeTheme();
  initializeTabs();
  initializeProfileForm();
  initializeRetirementForm();
  initializeSipForm();
  initializeStepupForm();
  initializeNpsForm();
  updateDashboard();
});

// ---------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------

function initializeTheme() {
  const saved = localStorage.getItem("nivesh_theme");
  if (saved === "dark") document.body.classList.add("dark");

  const themeButton = document.getElementById("themeButton");
  themeButton.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    localStorage.setItem("nivesh_theme", document.body.classList.contains("dark") ? "dark" : "light");
    if (portfolioChart) renderPortfolioChart(lastChartData); // re-theme chart colors
  });
}

// ---------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------

function initializeTabs() {
  const buttons = document.querySelectorAll(".tab-btn");
  buttons.forEach(button => {
    button.addEventListener("click", () => {
      buttons.forEach(b => b.classList.remove("active"));
      button.classList.add("active");

      document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
      document.getElementById("tab-" + button.dataset.tab).classList.add("active");

      if (button.dataset.tab === "dashboard") updateDashboard();
    });
  });
}

// ---------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------

function num(id) {
  return Number(document.getElementById(id).value) || 0;
}

function readJSON(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// ---------------------------------------------------------------------
// Dashboard / profile
// ---------------------------------------------------------------------

function initializeProfileForm() {
  const saved = readJSON("nivesh_profile");
  if (saved) {
    Object.keys(saved).forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = saved[id];
    });
  }

  const form = document.getElementById("profileForm");
  form.addEventListener("input", () => {
    const profile = {
      currentAge: num("currentAge"),
      retirementAge: num("retirementAge"),
      lifeExpectancy: num("lifeExpectancy"),
      monthlyExpense: num("monthlyExpense"),
      inflation: num("inflation"),
      preReturn: num("preReturn"),
      postReturn: num("postReturn"),
      existingCorpus: num("existingCorpus")
    };
    writeJSON("nivesh_profile", profile);
    updateDashboard();
  });
}

function updateDashboard() {
  const currentAge = num("currentAge");
  const retirementAge = num("retirementAge");
  const lifeExpectancy = num("lifeExpectancy");
  const monthlyExpense = num("monthlyExpense");
  const inflation = num("inflation");
  const preReturn = num("preReturn");
  const postReturn = num("postReturn");
  const existingCorpus = num("existingCorpus");

  const yearsToRetirement = Math.max(retirementAge - currentAge, 0);
  const retirementYears = Math.max(lifeExpectancy - retirementAge, 1);

  const requiredCorpus = Finance.retirementCorpus(
    monthlyExpense, inflation, yearsToRetirement, postReturn, retirementYears
  );

  // Pull in whatever the other calculators last computed, so the dashboard
  // reflects the whole plan rather than just the lump sum sitting idle.
  const sip = readJSON("nivesh_sip");
  const stepup = readJSON("nivesh_stepup");
  const nps = readJSON("nivesh_nps");

  const existingFV = Finance.existingCorpusFV(existingCorpus, preReturn, yearsToRetirement);
  const sipFV = sip ? sip.futureValue : 0;
  const stepupFV = stepup ? stepup.futureValue : 0;
  const npsFV = nps ? nps.totalCorpus : 0;

  const projectedCorpus = existingFV + sipFV + stepupFV + npsFV;

  document.getElementById("requiredCorpus").textContent = Finance.formatCompactIndian(requiredCorpus);
  document.getElementById("projectedCorpus").textContent = Finance.formatCompactIndian(projectedCorpus);

  const contributors = [];
  if (sipFV) contributors.push("SIP");
  if (stepupFV) contributors.push("step-up SIP");
  if (npsFV) contributors.push("NPS");
  document.getElementById("projectedSub").textContent = contributors.length
    ? "existing investments + " + contributors.join(" + ")
    : "existing investments, growing alone — visit the other tabs to add more";

  const gap = projectedCorpus - requiredCorpus;
  const gapCard = document.getElementById("gapCard");
  gapCard.classList.remove("positive", "negative");
  gapCard.classList.add(gap >= 0 ? "positive" : "negative");
  document.getElementById("gapLabel").textContent = gap >= 0 ? "Surplus" : "Shortfall";
  document.getElementById("gap").textContent = Finance.formatCompactIndian(Math.abs(gap));
  document.getElementById("gapSub").textContent = gap >= 0
    ? "your plan is on track"
    : "consider increasing your SIP or step-up rate";

  // Meter: required corpus is the track's full width; the fill shows how
  // much of it the projected corpus covers.
  const ratio = requiredCorpus > 0 ? Math.min(projectedCorpus / requiredCorpus, 1.5) : 1;
  const fillPct = Math.min(ratio, 1) * 100;
  document.getElementById("meterFill").style.width = fillPct + "%";
  document.getElementById("meterMarker").style.left = Math.min(ratio, 1) * 100 + "%";
  document.getElementById("meterCaption").textContent = gap >= 0
    ? `Your projected corpus covers ${Math.round(ratio * 100)}% of what you'll need.`
    : `Your projected corpus covers ${Math.round(ratio * 100)}% of what you'll need — a gap of ${Finance.formatCompactIndian(Math.abs(gap))}.`;

  buildDashboardChart(monthlyExpense, inflation, yearsToRetirement, preReturn, postReturn, existingCorpus, sip, stepup, nps, retirementYears, requiredCorpus, projectedCorpus);
}

let lastChartData = null;

function buildDashboardChart(monthlyExpense, inflation, yearsToRetirement, preReturn, postReturn, existingCorpus, sip, stepup, nps, retirementYears, requiredCorpus, projectedCorpus) {
  // Accumulation phase: approximate yearly projected corpus by scaling
  // existing corpus growth plus a straight-line share of the other
  // contributors (good enough for a shape-of-the-curve dashboard chart).
  const labels = [];
  const accumulation = [];

  for (let y = 0; y <= yearsToRetirement; y++) {
    const existingAtY = Finance.existingCorpusFV(existingCorpus, preReturn, y);
    const sipAtY = sip ? Finance.sipFutureValue(sip.monthly, sip.rate, Math.min(y, sip.years)) : 0;
    const stepupAtY = stepup ? Finance.stepUpSipFutureValue(stepup.monthly, stepup.stepUp, stepup.rate, Math.min(y, stepup.years)) : 0;
    const npsAtY = nps ? (nps.totalCorpus * (yearsToRetirement > 0 ? y / yearsToRetirement : 1)) : 0;
    labels.push(`Age ${num("currentAge") + y}`);
    accumulation.push(existingAtY + sipAtY + stepupAtY + npsAtY);
  }

  const depletion = Finance.corpusDepletionTable(
    projectedCorpus, monthlyExpense, inflation, yearsToRetirement, postReturn, retirementYears
  );
  depletion.forEach(row => {
    labels.push(`Age ${num("retirementAge") + row.year}`);
    accumulation.push(Math.max(row.closingBalance, 0));
  });

  lastChartData = { labels, data: accumulation };
  renderPortfolioChart(lastChartData);
}

function renderPortfolioChart(chartData) {
  if (!chartData) return;
  const ctx = document.getElementById("portfolioChart");
  if (!ctx) return;

  const isDark = document.body.classList.contains("dark");
  const lineColor = isDark ? "#D4AF37" : "#A6791E";
  const fillColor = isDark ? "rgba(212,175,55,0.15)" : "rgba(166,121,30,0.12)";
  const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(18,35,63,0.06)";
  const textColor = isDark ? "#9AA6BA" : "#5B6478";

  if (portfolioChart) portfolioChart.destroy();

  portfolioChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: chartData.labels,
      datasets: [{
        label: "Corpus (₹)",
        data: chartData.data,
        borderColor: lineColor,
        backgroundColor: fillColor,
        borderWidth: 2.5,
        pointRadius: 0,
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (item) => Finance.formatCompactIndian(item.parsed.y)
          }
        }
      },
      scales: {
        x: {
          ticks: { color: textColor, maxTicksLimit: 8 },
          grid: { color: gridColor }
        },
        y: {
          ticks: {
            color: textColor,
            callback: (v) => Finance.formatCompactIndian(v)
          },
          grid: { color: gridColor }
        }
      }
    }
  });
}

// ---------------------------------------------------------------------
// Retirement calculator tab
// ---------------------------------------------------------------------

function initializeRetirementForm() {
  document.getElementById("retirementForm").addEventListener("submit", (e) => {
    e.preventDefault();
    calculateRetirement();
  });
  calculateRetirement();
}

function calculateRetirement() {
  const expense = num("rExpense");
  const inflation = num("rInflation");
  const years = num("rYears");
  const returnRate = num("rReturn");
  const duration = num("rDuration");

  const future = Finance.futureExpense(expense, inflation, years);
  const annual = Finance.annualExpense(expense, inflation, years);
  const corpus = Finance.retirementCorpus(expense, inflation, years, returnRate, duration);

  document.getElementById("rFutureExpense").textContent = Finance.formatIndian(future);
  document.getElementById("rAnnualExpense").textContent = Finance.formatIndian(annual);
  document.getElementById("rResult").textContent = Finance.formatIndian(corpus);

  const table = Finance.corpusDepletionTable(corpus, expense, inflation, years, returnRate, duration);
  const tbody = document.querySelector("#rTable tbody");
  tbody.innerHTML = table.map(row => `
    <tr>
      <td>${row.year}</td>
      <td>${Finance.formatIndian(row.openingBalance)}</td>
      <td>${Finance.formatIndian(row.growth)}</td>
      <td>${Finance.formatIndian(row.withdrawal)}</td>
      <td>${Finance.formatIndian(row.closingBalance)}</td>
    </tr>
  `).join("");
}

// ---------------------------------------------------------------------
// SIP calculator tab
// ---------------------------------------------------------------------

function initializeSipForm() {
  document.getElementById("sipForm").addEventListener("submit", (e) => {
    e.preventDefault();
    calculateSip();
  });
  calculateSip();
}

function calculateSip() {
  const amount = num("sipAmount");
  const rate = num("sipReturn");
  const years = num("sipYears");
  const goal = num("sipGoal");

  const futureValue = Finance.sipFutureValue(amount, rate, years);
  document.getElementById("sipResult").textContent = Finance.formatIndian(futureValue);

  const goalCard = document.getElementById("sipGoalCard");
  if (goal > 0) {
    const inflation = (readJSON("nivesh_profile") || {}).inflation ?? 6;
    const gapInfo = Finance.goalGap(goal, inflation, years, futureValue);
    const requiredMonthly = Finance.requiredSip(gapInfo.inflatedGoal, rate, years);

    document.getElementById("sipRequired").textContent = Finance.formatIndian(requiredMonthly);
    document.getElementById("sipGoalNote").textContent =
      `Your goal of ${Finance.formatIndian(goal)} in today's rupees inflates to ` +
      `${Finance.formatIndian(gapInfo.inflatedGoal)} in ${years} years.`;
    goalCard.style.display = "block";
  } else {
    goalCard.style.display = "none";
  }

  writeJSON("nivesh_sip", { monthly: amount, rate, years, futureValue });
}

// ---------------------------------------------------------------------
// Step-up SIP calculator tab
// ---------------------------------------------------------------------

function initializeStepupForm() {
  document.getElementById("stepupForm").addEventListener("submit", (e) => {
    e.preventDefault();
    calculateStepup();
  });
  calculateStepup();
}

function calculateStepup() {
  const existing = num("suExisting");
  const monthly = num("suAmount");
  const stepUp = num("suStepUp");
  const rate = num("suReturn");
  const years = num("suYears");

  const contributionsFV = Finance.stepUpSipFutureValue(monthly, stepUp, rate, years);
  const existingFV = Finance.existingCorpusFV(existing, rate, years);
  const totalFV = contributionsFV + existingFV;
  const finalMonthly = monthly * Math.pow(1 + stepUp / 100, years - 1);

  document.getElementById("suResult").textContent = Finance.formatIndian(totalFV);
  document.getElementById("suFinalMonthly").textContent = Finance.formatIndian(finalMonthly);

  const table = Finance.stepUpSipYearTable(monthly, stepUp, rate, years);
  const tbody = document.querySelector("#suTable tbody");
  tbody.innerHTML = table.map(row => `
    <tr>
      <td>${row.year}</td>
      <td>${Finance.formatIndian(row.monthlyContribution)}</td>
      <td>${Finance.formatIndian(row.yearlyContribution)}</td>
      <td>${Finance.formatIndian(row.closingCorpus)}</td>
    </tr>
  `).join("");

  writeJSON("nivesh_stepup", { monthly, stepUp, rate, years, futureValue: totalFV });
}

// ---------------------------------------------------------------------
// NPS calculator tab
// ---------------------------------------------------------------------

function initializeNpsForm() {
  document.getElementById("npsForm").addEventListener("submit", (e) => {
    e.preventDefault();
    calculateNps();
  });
  calculateNps();
}

function calculateNps() {
  const existingCorpus = num("npsExisting");
  const employeeMonthly = num("npsEmployee");
  const employerMonthly = num("npsEmployer");
  const annualIncrementPct = num("npsIncrement");
  const expectedReturnPct = num("npsReturn");
  const yearsToRetirement = num("npsYears");
  const annuitizationPct = num("npsAnnuity");
  const annuityRatePct = num("npsAnnuityRate");

  const result = Finance.npsProjection({
    existingCorpus, employeeMonthly, employerMonthly,
    annualIncrementPct, expectedReturnPct, yearsToRetirement,
    annuitizationPct, annuityRatePct
  });

  document.getElementById("npsResult").textContent = Finance.formatIndian(result.totalCorpus);
  document.getElementById("npsLumpSum").textContent = Finance.formatIndian(result.lumpSum);
  document.getElementById("npsPension").textContent = Finance.formatIndian(result.monthlyPension) + " / month";

  writeJSON("nivesh_nps", { totalCorpus: result.totalCorpus });
}
