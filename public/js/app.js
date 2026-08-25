/* ---------------- STATE ---------------- */
let CARS = [];
let activeType = "all";
let compareSet = new Set();

const $ = (id) => document.getElementById(id);
const fmt = (n) => "$" + Math.round(n).toLocaleString("es-CL");

const defaults = {
  BEV: { insurance: 450000, maint: 180000 },
  HEV: { insurance: 480000, maint: 420000 },
  PHEV: { insurance: 520000, maint: 450000 },
};

/* ---------------- COST CALCULATION ---------------- */
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

function currentParams() {
  return {
    priceGas: parseFloat($("priceGas").value) || 0,
    priceKwh: parseFloat($("priceKwh").value) || 0,
    kmDay: parseFloat($("kmDay").value) || 0,
  };
}

/* ---------------- FETCH ---------------- */
async function loadCars() {
  const res = await fetch("/api/cars");
  CARS = await res.json();
  renderGrid();
}

/* ---------------- FILTER + SORT ---------------- */
function getFilteredCars() {
  const { priceGas, priceKwh, kmDay } = currentParams();
  const seatsMin = parseInt($("fSeats").value) || 0;
  const transmission = $("fTransmission").value;
  const airbagsMin = parseInt($("fAirbags").value) || 0;
  const maxPrice = parseFloat($("fMaxPrice").value) || Infinity;
  const sort = $("fSort").value;

  let list = CARS.filter((c) => {
    if (activeType !== "all" && c.type !== activeType) return false;
    if (seatsMin && c.seats < seatsMin) return false;
    if (transmission && c.transmission !== transmission) return false;
    if (airbagsMin && c.airbags < airbagsMin) return false;
    if (c.price > maxPrice) return false;
    return true;
  });

  list = list.map((c) => ({ ...c, _cost: costPerKm(c, priceGas, priceKwh, kmDay) }));

  if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
  if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
  if (sort === "cost-asc") list.sort((a, b) => a._cost - b._cost);
  if (sort === "safety-desc") list.sort((a, b) => (b.safetyStars || 0) - (a.safetyStars || 0));

  return list;
}

/* ---------------- RENDER GRID ---------------- */
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
        <span class="spec-pill">${car.transmission}</span>
        <span class="spec-pill">${car.warrantyYears} años garantía</span>
        ${car.safetyStars ? `<span class="spec-pill">${car.safetyStars}★ Latin NCAP</span>` : ""}
      </div>
      <div class="card-actions">
        <label class="compare-check"><input type="checkbox" data-id="${car.id}" class="compareChk" ${compareSet.has(car.id) ? "checked" : ""}> Comparar</label>
        <button class="btn primary small" data-id="${car.id}">Ver detalle</button>
      </div>
    `;
    grid.appendChild(card);
  });

  grid.querySelectorAll(".btn.primary").forEach((btn) => {
    btn.addEventListener("click", () => openDetail(btn.dataset.id));
  });
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
  if (compareSet.size === 0) {
    bar.classList.remove("show");
    return;
  }
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
  const { priceGas, priceKwh, kmDay } = currentParams();
  const cars = [...compareSet].map((id) => CARS.find((c) => c.id === id)).filter(Boolean);
  const rows = [
    ["Tipo", (c) => c.type],
    ["Precio", (c) => fmt(c.price)],
    ["Costo/km", (c) => fmt(costPerKm(c, priceGas, priceKwh, kmDay))],
    ["Consumo", (c) => consumptionLabel(c)],
    ["Asientos", (c) => c.seats],
    ["Airbags", (c) => c.airbags],
    ["Transmisión", (c) => c.transmission],
    ["Garantía", (c) => `${c.warrantyYears} años / ${c.warrantyKm.toLocaleString("es-CL")} km`],
    ["Procedencia", (c) => c.origin],
    ["Seguridad", (c) => (c.safetyStars ? `${c.safetyStars}★ Latin NCAP` : "No evaluado")],
  ];

  let html = `<tr><th>Atributo</th>${cars.map((c) => `<th>${c.name}</th>`).join("")}</tr>`;
  rows.forEach(([label, fn]) => {
    html += `<tr><td>${label}</td>${cars.map((c) => `<td>${fn(c)}</td>`).join("")}</tr>`;
  });
  $("compareTable").innerHTML = html;
  $("compareOverlay").classList.add("show");
});

$("closeCompare").addEventListener("click", () => $("compareOverlay").classList.remove("show"));
$("compareOverlay").addEventListener("click", (e) => {
  if (e.target.id === "compareOverlay") $("compareOverlay").classList.remove("show");
});

/* ---------------- DETAIL MODAL ---------------- */
function openDetail(carId) {
  const car = CARS.find((c) => c.id === carId);
  if (!car) return;
  const { priceGas, priceKwh, kmDay } = currentParams();
  const cpk = costPerKm(car, priceGas, priceKwh, kmDay);
  const monthCost = cpk * kmDay * 30;
  const def = defaults[car.type];

  $("detailModal").innerHTML = `
    <button class="modal-close" id="closeDetail">&times;</button>
    <span class="badge ${car.type}">${car.type}</span>
    <h2 style="margin-top:8px;">${car.name}</h2>
    <p class="section-desc" style="margin-top:0;">${car.segment} · ${car.brand} · ${car.origin}</p>

    <div class="detail-grid">
      <div>
        <h3>Ficha técnica</h3>
        <div class="spec-list">
          <div class="spec-line"><span class="k">Precio de lista</span><span class="v">${fmt(car.price)}${car.approxPrice ? " *" : ""}</span></div>
          <div class="spec-line"><span class="k">Consumo</span><span class="v">${consumptionLabel(car)}</span></div>
          <div class="spec-line"><span class="k">Costo por km (hoy)</span><span class="v">${fmt(cpk)}</span></div>
          <div class="spec-line"><span class="k">Costo mensual estimado</span><span class="v">${fmt(monthCost)}</span></div>
          <div class="spec-line"><span class="k">Asientos</span><span class="v">${car.seats}</span></div>
          <div class="spec-line"><span class="k">Airbags</span><span class="v">${car.airbags}</span></div>
          <div class="spec-line"><span class="k">Transmisión</span><span class="v">${car.transmission}</span></div>
          <div class="spec-line"><span class="k">Garantía</span><span class="v">${car.warrantyYears} años / ${car.warrantyKm.toLocaleString("es-CL")} km</span></div>
          <div class="spec-line"><span class="k">Seguridad</span><span class="v">${car.safetyStars ? car.safetyStars + "★ Latin NCAP" : "No evaluado aún"}</span></div>
        </div>

        <h3 style="margin-top:18px;">Simulador de crédito</h3>
        <div class="grid2">
          <div class="field"><label>Pie (%)</label><input type="number" id="dDown" value="20" min="0" max="90"></div>
          <div class="field"><label>Plazo (años)</label><input type="number" id="dYears" value="4" min="1" max="7"></div>
          <div class="field"><label>Tasa anual (%)</label><input type="number" id="dRate" value="9" step="0.1"></div>
        </div>
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
          <div class="field" style="margin-bottom:10px;"><label>Mensaje</label><textarea id="lMessage" placeholder="Ej: quiero agendar un test drive"></textarea></div>
          <button type="submit" class="btn primary" style="width:100%;">Enviar contacto</button>
          <div class="form-msg" id="leadMsg"></div>
        </form>
      </div>
    </div>
  `;

  $("closeDetail").addEventListener("click", closeDetail);

  function recalcDetail() {
    const down = parseFloat($("dDown").value) || 0;
    const years = parseFloat($("dYears").value) || 1;
    const rate = parseFloat($("dRate").value) || 0;
    const ins = parseFloat($("dIns").value) || 0;
    const maint = parseFloat($("dMaint").value) || 0;

    const financed = car.price * (1 - down / 100);
    const monthlyRate = rate / 100 / 12;
    const n = years * 12;
    let quota = monthlyRate === 0 ? financed / n : (financed * monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1);
    if (!isFinite(quota)) quota = 0;

    const { priceGas, priceKwh, kmDay } = currentParams();
    const energyMonth = costPerKm(car, priceGas, priceKwh, kmDay) * kmDay * 30;
    const total = quota + ins / 12 + maint / 12 + energyMonth;

    $("dQuota").textContent = fmt(quota);
    $("dTotal").textContent = fmt(total);
  }
  ["dDown", "dYears", "dRate", "dIns", "dMaint"].forEach((id) => $(id).addEventListener("input", recalcDetail));
  recalcDetail();

  $("leadForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msgEl = $("leadMsg");
    msgEl.className = "form-msg";
    const payload = {
      carId: car.id,
      name: $("lName").value,
      phone: $("lPhone").value,
      email: $("lEmail").value,
      comuna: $("lComuna").value,
      message: $("lMessage").value,
    };
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
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

function closeDetail() {
  $("detailOverlay").classList.remove("show");
}
$("detailOverlay").addEventListener("click", (e) => {
  if (e.target.id === "detailOverlay") closeDetail();
});

/* ---------------- BINDINGS ---------------- */
document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    document.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    activeType = chip.dataset.type;
    renderGrid();
  });
});

["fSeats", "fTransmission", "fAirbags", "fMaxPrice", "fSort"].forEach((id) => $(id).addEventListener("input", renderGrid));

$("kmDay").addEventListener("input", () => {
  $("kmDayLabel").textContent = $("kmDay").value + " km";
  renderGrid();
});
$("priceGas").addEventListener("input", renderGrid);
$("priceKwh").addEventListener("input", renderGrid);

/* ---------------- INIT ---------------- */
loadCars();
