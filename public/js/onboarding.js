const TOTAL_STEPS = 6;
let currentStep = 1;

const answers = {
  type: null,
  segment: null,
  kmDay: 40,
  savings: 0,
  hasTradeIn: null,
  tradeInValue: 0,
  monthlyBudget: null,
};

function updateProgress() {
  const pct = (currentStep / TOTAL_STEPS) * 100;
  $("progressFill").style.width = pct + "%";
  $("stepCounter").textContent = `Pregunta ${currentStep} de ${TOTAL_STEPS}`;
}

function showStep(n) {
  document.querySelectorAll(".step").forEach((s) => s.classList.remove("active"));
  document.querySelector(`.step[data-step="${n}"]`).classList.add("active");
  $("backBtn").style.visibility = n === 1 ? "hidden" : "visible";
  $("nextBtn").textContent = n === TOTAL_STEPS ? "Ver resultados →" : "Siguiente →";
  updateProgress();
  validateCurrentStep();
}

function validateCurrentStep() {
  let valid = true;
  if (currentStep === 1) valid = !!answers.type;
  if (currentStep === 2) valid = !!answers.segment;
  if (currentStep === 3) valid = answers.kmDay > 0;
  if (currentStep === 4) valid = answers.savings !== null && answers.savings !== "" && !isNaN(answers.savings);
  if (currentStep === 5) valid = answers.hasTradeIn !== null && (answers.hasTradeIn === "no" || (answers.tradeInValue !== "" && !isNaN(answers.tradeInValue)));
  if (currentStep === 6) valid = answers.monthlyBudget !== null && answers.monthlyBudget !== "" && !isNaN(answers.monthlyBudget) && answers.monthlyBudget > 0;
  $("nextBtn").disabled = !valid;
}

/* ---- Step 1: type ---- */
document.querySelectorAll("#typeChoices .choice").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#typeChoices .choice").forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");
    answers.type = btn.dataset.value;
    validateCurrentStep();
  });
});

/* ---- Step 2: segment ---- */
document.querySelectorAll("#segmentChoices .choice").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#segmentChoices .choice").forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");
    answers.segment = btn.dataset.value;
    validateCurrentStep();
  });
});

/* ---- Step 3: km/day ---- */
$("kmDay").addEventListener("input", () => {
  answers.kmDay = parseFloat($("kmDay").value);
  $("kmDayValue").textContent = answers.kmDay + " km";
  validateCurrentStep();
});

/* ---- Step 4: savings ---- */
$("savings").addEventListener("input", () => {
  answers.savings = $("savings").value === "" ? "" : parseFloat($("savings").value);
  validateCurrentStep();
});

/* ---- Step 5: trade-in ---- */
document.querySelectorAll('.step[data-step="5"] .choice-grid .choice').forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll('.step[data-step="5"] .choice-grid .choice').forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");
    answers.hasTradeIn = btn.dataset.value;
    $("tradeInBlock").style.display = btn.dataset.value === "yes" ? "block" : "none";
    if (btn.dataset.value === "no") answers.tradeInValue = 0;
    validateCurrentStep();
  });
});
$("tradeInValue").addEventListener("input", () => {
  answers.tradeInValue = $("tradeInValue").value === "" ? "" : parseFloat($("tradeInValue").value);
  validateCurrentStep();
});

/* ---- Step 6: budget ---- */
$("monthlyBudget").addEventListener("input", () => {
  answers.monthlyBudget = $("monthlyBudget").value === "" ? "" : parseFloat($("monthlyBudget").value);
  validateCurrentStep();
});

/* ---- Navigation ---- */
$("nextBtn").addEventListener("click", () => {
  if ($("nextBtn").disabled) return;
  if (currentStep < TOTAL_STEPS) {
    currentStep++;
    showStep(currentStep);
  } else {
    const profile = {
      type: answers.type,
      segment: answers.segment,
      kmDay: answers.kmDay,
      savings: Number(answers.savings) || 0,
      hasTradeIn: answers.hasTradeIn === "yes",
      tradeInValue: Number(answers.tradeInValue) || 0,
      monthlyBudget: Number(answers.monthlyBudget) || 0,
    };
    saveProfile(profile);
    window.location.href = "/results.html";
  }
});

$("backBtn").addEventListener("click", () => {
  if (currentStep > 1) {
    currentStep--;
    showStep(currentStep);
  }
});

/* ---- Init ---- */
showStep(1);
