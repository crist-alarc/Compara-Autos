const $ = (id) => document.getElementById(id);
const fmt = (n) => "$" + Math.round(n).toLocaleString("es-CL");

const insuranceMaintDefaults = {
  BEV: { insurance: 450000, maint: 180000 },
  HEV: { insurance: 480000, maint: 420000 },
  PHEV: { insurance: 520000, maint: 450000 },
};

const DEFAULT_TERM_YEARS = 4;
const MIN_TERM_YEARS = 1;
const MAX_TERM_YEARS = 7;
const DEFAULT_RATE = 9; // % anual

function costPerKm(car, priceGas, priceKwh, kmDay) {
  if (car.type === "BEV") return (car.kwh100 / 100) * priceKwh;
  if (car.type === "HEV") return priceGas / car.kml;
  if (car.type === "PHEV") {
    const evCost = (car.evKwh100 / 100) * priceKwh;
    const iceCost = priceGas / car.kml;
    if (kmDay <= car.evRange) return evCost;
    const evKm = car.evRange;
    const iceKm = kmDay - car.evRange;
    return (evKm * evCost + iceKm * iceCost) / kmDay;
  }
  return 0;
}

function consumptionLabel(car) {
  if (car.type === "BEV") return `${car.kwh100.toFixed(1)} kWh/100km`;
  if (car.type === "HEV") return `${car.kml} km/L`;
  if (car.type === "PHEV") return `${car.evRange} km eléctricos + ${car.kml} km/L`;
}

function loanQuote(financed, years, annualRatePct) {
  const monthlyRate = annualRatePct / 100 / 12;
  const n = years * 12;
  if (financed <= 0) return 0;
  if (monthlyRate === 0) return financed / n;
  const q = (financed * (monthlyRate * Math.pow(1 + monthlyRate, n))) / (Math.pow(1 + monthlyRate, n) - 1);
  return isFinite(q) ? q : 0;
}

// Busca el plazo con MENOS cuotas que aun asi calce en el presupuesto.
// Si el plazo por defecto (4 anos) ya calza, puede sugerir un plazo mas corto (ahorra intereses).
// Si no calza en 4 anos, extiende el plazo hasta 7 anos para bajar la cuota.
function evaluateBudgetFit(car, profile) {
  const totalDown = (profile.savings || 0) + (profile.hasTradeIn ? profile.tradeInValue || 0 : 0);
  const financed = Math.max(car.price - totalDown, 0);

  for (let y = MIN_TERM_YEARS; y <= MAX_TERM_YEARS; y++) {
    const q = loanQuote(financed, y, DEFAULT_RATE);
    if (q <= profile.monthlyBudget) {
      return {
        status: y <= DEFAULT_TERM_YEARS ? "fits" : "adjustable",
        quota: q,
        years: y,
        financed,
      };
    }
  }
  return {
    status: "over",
    quota: loanQuote(financed, MAX_TERM_YEARS, DEFAULT_RATE),
    years: MAX_TERM_YEARS,
    financed,
  };
}

function getProfile() {
  const raw = sessionStorage.getItem("searchProfile");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveProfile(profile) {
  sessionStorage.setItem("searchProfile", JSON.stringify(profile));
}
