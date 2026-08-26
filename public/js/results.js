let CARS = [];
let compareSet = new Set();
let profile = getProfile();

// Si alguien entra directo a /results.html sin pasar por el asistente, mandamos con valores neutros.
if (!profile) {
  profile = { type: "all", segment: "Cualquiera", kmDay: 40, savings: 0, hasTradeIn: false, tradeInValue: 0, monthlyBudget: 400000 };
  saveProfile(profile);
}

function segmentGroup(segmentText) {
  // Normaliza los segmentos detallados del catálogo (ej "SUV compacto") a las categorías del filtro (ej "SUV")
  if (segmentText.includes("SUV")) return "SUV";
  if (segmentText.includes("Pick up")) return "Pick up";
  if (segmentText.includes("Sedán")) return "Sedán";
  if (segmentText.includes("Hatchback")) return "Hatchback";
  if (segmentText.includes("City car")) return "City car";
  return segmentText;
}

/* ---------------- PROFILE BANNER ---------------- */
function renderProfileBanner() {
  const totalDown = profile.savings + (profile.hasTradeIn ? profile.tradeInValue : 0);
  const typeLabel = { BEV: "Eléctrico", HEV: "Híbrido", PHEV: "Híbrido enchufable", all: "Cualquier tipo" }[profile.type] || "Cualquier tipo";
  $("profileBanner").innerHTML = `
    Buscas: <b>${typeLabel}</b> · <b>${profile.segment}</b> · manejas <b>${profile.kmDay} km/día</b> ·
    pie disponible <b>${fmt(totalDown)}</b>${profile.hasTradeIn ? ` (incluye parte de pago de ${fmt(profile.tradeInValue)})` : ""} ·
    presupuesto <b>${fmt(profile.monthlyBudget)}/mes</b>
  `;
}

/* ---------------- LOAD ---------------- */
async function loadCars() {
  const res = await fetch("/api/cars");
  CARS = await res.json();

  // Pre-marcar filtros de la barra lateral según lo elegido en el asistente
  if (profile.type !== "all") {
    document.querySelectorAll(".fType").forEach((chk) => (chk.checked = chk.value === profile.type));
  }
  if (profile.segment && profile.segment !== "Cualquiera") {
    document.querySelectorAll(".fSeg").forEach((chk) => (chk.checked = chk.value === profile.segment));
  }

  renderProfileBanner();
  renderGrid();
}

/* ---------------- FILTER + SORT ---------------- */
function getFilteredCars() {
  const priceGas = parseFloat($("priceGas").value) || 0;
  const priceKwh = parseFloat($("priceKwh").value) || 0;
  const kmDay = profile.kmDay;

  const activeTypes = [...document.querySelectorAll(".fType:checked")].map((c) => c.value);
  const activeSegs = [...document.querySelectorAll(".fSeg:checked")].map((c) => c.value);
  const seatsMin = parseInt($("fSeats").value) || 0;
  const airbagsMin = parseInt($("fAirbags").value) || 0;
  const maxPrice = parseFloat($("fMaxPrice").value) || Infinity;
  const sort = $("fSort").value;

  let list = CARS.filter((c) => {
    if (activeTypes.length && !activeTypes.includes(c.type)) return false;
    if (activeSegs.length && !activeSegs.includes(segmentGroup(c.segment))) return false;
    if (seatsMin && c.seats < seatsMin) return false;
    if (airbagsMin && c.airbags < airbagsMin) return false;
    if (c.price > maxPrice) return false;
    return true;
  });

  list = list.map((c) => ({
    ...c,
    _cost: costPerKm(c, priceGas, priceKwh, kmDay),
    _budget: evaluateBudgetFit(c, profile),
  }));

  if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
  else if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
  else if (sort === "cost-asc") list.sort((a, b) => a._cost - b._cost);
  else {
    // "budget": autos que calzan primero (ordenados por menos cuotas = menos años),
    // luego los ajustables (menos años primero), luego los que exceden (más cerca del presupuesto primero)
    const statusOrder = { fits: 0, adjustable: 1, over: 2 };
    list.sort((a, b) => {
      const sd = statusOrder[a._budget.status] - statusOrder[b._budget.status];
      if (sd !== 0) return sd;
      if (a._budget.status === "over") return a._budget.quota - b._budget.quota;
      return a._budget.years - b._budget.years;
    });
  }

  return list;
}

/* ---------------- RENDER GRID ---------------- */
function budgetBadgeHtml(fit) {
  if (fit.status === "fits") {
    return `<div class="budget-badge fits">✓ Se ajusta a tu presupuesto<br>${fit.years} año${fit.years === 1 ? "" : "s"} · cuota ${fmt(fit.quota)}/mes</div>`;
  }
  if (fit.status === "adjustable") {
    return `<div class="budget-badge adjustable">↔ Ajustable a tu presupuesto<br>extendiendo a ${fit.years} años, cuota ${fmt(fit.quota)}/mes</div>`;
  }
  return `<div class="budget-badge over">⚠ Sobre tu presupuesto<br>incluso a ${fit.years} años, cuota ${fmt(fit.quota)}/mes</div>`;
}

function renderGrid() {
  const list = getFilteredCars();
  $("resultsCount").textContent = `${list.length} modelo${list.length === 1 ? "" : "s"} encontrados`;
  const grid = $("grid");
  grid.innerHTML = "";

  list.forEach((car) => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="card-top">
        <div>
          <span class="card-name">${car.name}</span>
          <span class="card-seg">${car.segment}${car.approxPrice ? " · precio referencial" : ""}</span>
        </div>
        <span class="badge ${car.type}">${car.type}</span>
      </div>
      <div class="card-price">${fmt(car.price)}</div>
      <div class="card-cost ${car.type}">${fmt(car._cost)}/km · ${consumptionLabel(car)}</div>
      <div class="card-specs">
        <span class="spec-pill">${car.seats} asientos</span>
        <span class="spec-pill">${car.airbags} airbags</span>
        <span class="spec-pill">${car.warrantyYears} años garantía</span>
        ${car.safetyStars ? `<span class="spec-pill">${car.safetyStars}★ Latin NCAP</span>` : ""}
      </div>
      ${budgetBadgeHtml(car._budget)}
      <div class="card-actions">
        <label class="compare-check"><input type="checkbox" data-id="${car.id}" class="compareChk" ${compareSet.has(car.id) ? "checked" : ""}> Comparar</label>
        <button class="btn primary small" data-id="${car.id}">Ver detalle</button>
      </div>
    `;
    grid.appendChild(card);
  });

  grid.querySelectorAll(".btn.primary").forEach((btn) => btn.addEventListener("click", () => openDetail(btn.dataset.id)));
  grid.querySelectorAll(".compareChk").forEach((chk) => {
    chk.addEventListener("change", () => {
      if (chk.checked) {
        if (compareSet.size >= 3) {
          chk.checked = false;
          alert("Puedes comparar máximo 3 autos a la vez.");
          return;
        }
        compareSet.add(chk.dataset.id);
      } else {
        compareSet.delete(chk.dataset.id);
      }
      updateCompareBar();
    });
  });
  }

/* ---------------- COMPARE BAR ---------------- */
function updateCompareBar() {
  const bar = $("compareBar");
  if (compareSet.size === 0) return bar.classList.remove("show");
  bar.classList.add("show");
  const names = [...compareSet].map((id) => CARS.find((c) => c.id === id)?.name).filter(Boolean);
  $("compareNames").textContent = `${names.length} auto${names.length === 1 ? "" : "s"}: ${names.join(" · ")}`;
}

$("clearCompare").addEventListener("click", () => {
  compareSet.clear();
  updateCompareBar();
  renderGrid();
});

$("openCompare").addEventListener("click", () => {
  const priceGas = parseFloat($("priceGas").value) || 0;
  const priceKwh = parseFloat($("priceKwh").value) || 0;
  const cars = [...compareSet].map((id) => CARS.find((c) => c.id === id)).filter(Boolean);
  const rows = [
    ["Tipo", (c) => c.type],
    ["Precio", (c) => fmt(c.price)],
    ["Costo/km", (c) => fmt(costPerKm(c, priceGas, priceKwh, profile.kmDay))],
    ["Consumo", (c) => consumptionLabel(c)],
    ["Cuota estimada", (c) => { const f = evaluateBudgetFit(c, profile); return `${fmt(f.quota)}/mes a ${f.years} años`; }],
    ["Asientos", (c) => c.seats],
    ["Airbags", (c) => c.airbags],
    ["Garantía", (c) => `${c.warrantyYears} años / ${c.warrantyKm.toLocaleString("es-CL")} km`],
    ["Procedencia", (c) => c.origin],
    ["Seguridad", (c) => (c.safetyStars ? `${c.safetyStars}★ Latin NCAP` : "No evaluado")],
  ];
  let html = `<tr><th>Atributo</th>${cars.map((c) => `<th>${c.name}</th>`).join("")}</tr>`;
  rows.forEach(([label, fn]) => (html += `<tr><td>${label}</td>${cars.map((c) => `<td>${fn(c)}</td>`).join("")}</tr>`));
  $("compareTable").innerHTML = html;
  $("compareOverlay").classList.add("show");
});
$("closeCompare").addEventListener("click", () => $("compareOverlay").classList.remove("show"));
$("compareOverlay").addEventListener("click", (e) => { if (e.target.id === "compareOverlay") $("compareOverlay").classList.remove("show"); });

/* ---------------- DETAIL MODAL ---------------- */
function openDetail(carId) {
  const car = CARS.find((c) => c.id === carId);
  if (!car) return;
  const priceGas = parseFloat($("priceGas").value) || 0;
  const priceKwh = parseFloat($("priceKwh").value) || 0;
  const cpk = costPerKm(car, priceGas, priceKwh, profile.kmDay);
  const fit = evaluateBudgetFit(car, profile);
  const def = insuranceMaintDefaults[car.type];

  $("detailModal").innerHTML = `
    <button class="modal-close" id="closeDetail">&times;</button>
    <span class="badge ${car.type}">${car.type}</span>
    <h2 style="margin-top:8px;">${car.name}</h2>
    <p class="section-desc" style="margin-top:0;">${car.segment} · ${car.brand} · ${car.origin}</p>
    ${budgetBadgeHtml(fit)}

    <div class="detail-grid" style="margin-top:16px;">
      <div>
        <h3>Ficha técnica</h3>
        <div class="spec-list">
          <div class="spec-line"><span class="k">Precio de lista</span><span class="v">${fmt(car.price)}${car.approxPrice ? " *" : ""}</span></div>
          <div class="spec-line"><span class="k">Consumo</span><span class="v">${consumptionLabel(car)}</span></div>
          <div class="spec-line"><span class="k">Costo por km (con tu manejo)</span><span class="v">${fmt(cpk)}</span></div>
          <div class="spec-line"><span class="k">Asientos</span><span class="v">${car.seats}</span></div>
          <div class="spec-line"><span class="k">Airbags</span><span class="v">${car.airbags}</span></div>
          <div class="spec-line"><span class="k">Transmisión</span><span class="v">${car.transmission}</span></div>
          <div class="spec-line"><span class="k">Garantía</span><span class="v">${car.warrantyYears} años / ${car.warrantyKm.toLocaleString("es-CL")} km</span></div>
          <div class="spec-line"><span class="k">Seguridad</span><span class="v">${car.safetyStars ? car.safetyStars + "★ Latin NCAP" : "No evaluado aún"}</span></div>
        </div>

        <h3 style="margin-top:18px;">Simulador de crédito</h3>
        <div class="grid2">
          <div class="field"><label>Plazo (años)</label><input type="number" id="dYears" value="${fit.years}" min="1" max="7"></div>
          <div class="field"><label>Tasa anual (%)</label><input type="number" id="dRate" value="9" step="0.1"></div>
        </div>
        <p class="hint" style="margin-top:6px;">Pie considerado: ${fmt(profile.savings + (profile.hasTradeIn ? profile.tradeInValue : 0))} (de tu ahorro + parte de pago)</p>
        <div class="stat-list" style="margin-top:10px;">
          <div class="stat-line"><span class="k">Cuota mensual</span><span class="v" id="dQuota">$0</span></div>
        </div>

        <h3 style="margin-top:18px;">Seguro y mantención (estimado)</h3>
        <div class="grid2">
          <div class="field"><label>Seguro anual</label><input type="number" id="dIns" value="${def.insurance}"></div>
          <div class="field"><label>Mantención anual</label><input type="number" id="dMaint" value="${def.maint}"></div>
        </div>
        <div class="stat-list" style="margin-top:10px;">
          <div class="stat-line total"><span class="k">Costo total estimado / mes</span><span class="v" id="dTotal">$0</span></div>
        </div>
      </div>

      <div>
        <h3>Contactar al concesionario</h3>
        <p class="section-desc" style="margin-top:0;">Deja tus datos y te contactamos con quien vende este modelo.</p>
        <form id="leadForm">
          <div class="field" style="margin-bottom:10px;"><label>Nombre completo *</label><input type="text" id="lName" required></div>
          <div class="field" style="margin-bottom:10px;"><label>Teléfono *</label><input type="tel" id="lPhone" required></div>
          <div class="field" style="margin-bottom:10px;"><label>Email</label><input type="email" id="lEmail"></div>
          <div class="field" style="margin-bottom:10px;"><label>Comuna</label><input type="text" id="lComuna"></div>
          <div class="field" style="margin-bottom:10px;"><label>Mensaje</label><textarea id="lMessage"></textarea></div>
          <button type="submit" class="btn primary" style="width:100%;">Enviar contacto</button>
          <div class="form-msg" id="leadMsg"></div>
        </form>
      </div>
    </div>
  `;

  $("closeDetail").addEventListener("click", closeDetail);

  function recalcDetail() {
    const years = parseFloat($("dYears").value) || 1;
    const rate = parseFloat($("dRate").value) || 0;
    const ins = parseFloat($("dIns").value) || 0;
    const maint = parseFloat($("dMaint").value) || 0;
    const totalDown = profile.savings + (profile.hasTradeIn ? profile.tradeInValue : 0);
    const financed = Math.max(car.price - totalDown, 0);
    const quota = loanQuote(financed, years, rate);
    const energyMonth = costPerKm(car, parseFloat($("priceGas").value) || 0, parseFloat($("priceKwh").value) || 0, profile.kmDay) * profile.kmDay * 30;
    $("dQuota").textContent = fmt(quota);
    $("dTotal").textContent = fmt(quota + ins / 12 + maint / 12 + energyMonth);
  }
  ["dYears", "dRate", "dIns", "dMaint"].forEach((id) => $(id).addEventListener("input", recalcDetail));
  recalcDetail();

  $("leadForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msgEl = $("leadMsg");
    msgEl.className = "form-msg";
    const payload = { carId: car.id, name: $("lName").value, phone: $("lPhone").value, email: $("lEmail").value, comuna: $("lComuna").value, message: $("lMessage").value };
    try {
      const res = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al enviar");
      msgEl.textContent = "¡Listo! Te contactaremos pronto sobre este modelo.";
      msgEl.classList.add("ok");
      $("leadForm").reset();
    } catch (err) {
      msgEl.textContent = "No pudimos enviar tu contacto: " + err.message;
      msgEl.classList.add("err");
    }
  });

  $("detailOverlay").classList.add("show");
}
function closeDetail() { $("detailOverlay").classList.remove("show"); }
$("detailOverlay").addEventListener("click", (e) => { if (e.target.id === "detailOverlay") closeDetail(); });

/* ---------------- BINDINGS ---------------- */
document.querySelectorAll(".fType, .fSeg").forEach((el) => el.addEventListener("change", renderGrid));
["fSeats", "fAirbags", "fMaxPrice", "fSort", "priceGas", "priceKwh"].forEach((id) => $(id).addEventListener("input", renderGrid));

/* ---------------- INIT ---------------- */
loadCars();
