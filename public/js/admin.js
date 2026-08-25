const $ = (id) => document.getElementById(id);
const fmt = (n) => "$" + Math.round(n).toLocaleString("es-CL");

let authHeader = null;

/* ---------------- LOGIN GATE ---------------- */
$("gateBtn").addEventListener("click", async () => {
  const user = $("gateUser").value;
  const pass = $("gatePass").value;
  const encoded = btoa(`${user}:${pass}`);
  const header = `Basic ${encoded}`;

  const res = await fetch("/api/admin/leads", { headers: { Authorization: header } });
  if (res.status === 401) {
    $("gateError").style.display = "block";
    $("gateError").textContent = "Usuario o contraseña incorrectos.";
    return;
  }
  authHeader = header;
  $("loginGate").style.display = "none";
  $("adminContent").style.display = "block";
  loadLeads();
  loadCars();
});

function authFetch(url, options = {}) {
  return fetch(url, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: authHeader },
  });
}

/* ---------------- TABS ---------------- */
document.querySelectorAll(".tabbtn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tabbtn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
    btn.classList.add("active");
    $(btn.dataset.view).classList.add("active");
  });
});

/* ---------------- LEADS ---------------- */
async function loadLeads() {
  const res = await authFetch("/api/admin/leads");
  const leads = await res.json();
  $("leadsCount").textContent = `${leads.length} lead(s) recibidos`;

  let html = `<tr><th>Fecha</th><th>Nombre</th><th>Teléfono</th><th>Email</th><th>Auto</th><th>Comuna</th><th>Mensaje</th><th>Estado</th></tr>`;
  leads.forEach((l) => {
    const date = new Date(l.createdAt).toLocaleString("es-CL");
    html += `<tr>
      <td>${date}</td>
      <td>${l.name}</td>
      <td>${l.phone}</td>
      <td>${l.email || "-"}</td>
      <td>${l.carName}</td>
      <td>${l.comuna || "-"}</td>
      <td>${l.message || "-"}</td>
      <td>
        <select class="status-select" data-id="${l.id}">
          <option value="nuevo" ${l.status === "nuevo" ? "selected" : ""}>Nuevo</option>
          <option value="contactado" ${l.status === "contactado" ? "selected" : ""}>Contactado</option>
          <option value="vendido" ${l.status === "vendido" ? "selected" : ""}>Vendido</option>
          <option value="descartado" ${l.status === "descartado" ? "selected" : ""}>Descartado</option>
        </select>
      </td>
    </tr>`;
  });
  $("leadsTable").innerHTML = html;

  document.querySelectorAll(".status-select").forEach((sel) => {
    sel.addEventListener("change", async () => {
      await authFetch(`/api/admin/leads/${sel.dataset.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: sel.value }),
      });
    });
  });
}

/* ---------------- CARS ---------------- */
let carsCache = [];

async function loadCars() {
  const res = await authFetch("/api/admin/cars");
  carsCache = await res.json();
  renderCarsList();
}

function renderCarsList() {
  const el = $("carsList");
  el.innerHTML = "";
  carsCache.forEach((car) => {
    const row = document.createElement("div");
    row.className = "car-row";
    row.innerHTML = `
      <span>${car.name} <span style="color:var(--ink-dim);">(${car.id})</span></span>
      <span class="badge ${car.type}">${car.type}</span>
      <span>${fmt(car.price)}</span>
      <span>${car.seats} asientos</span>
      <span style="display:flex;gap:6px;">
        <button class="btn small" data-edit="${car.id}">Editar</button>
        <button class="btn small" data-del="${car.id}">Eliminar</button>
      </span>
    `;
    el.appendChild(row);
  });

  el.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => editCar(b.dataset.edit)));
  el.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", () => deleteCar(b.dataset.del)));
}

function editCar(id) {
  const car = carsCache.find((c) => c.id === id);
  if (!car) return;
  $("formTitle").textContent = "Editar auto";
  $("cEditId").value = car.id;
  $("cId").value = car.id;
  $("cId").disabled = true;
  $("cName").value = car.name || "";
  $("cBrand").value = car.brand || "";
  $("cSegment").value = car.segment || "";
  $("cType").value = car.type || "BEV";
  $("cPrice").value = car.price || "";
  $("cKwh100").value = car.kwh100 || "";
  $("cKml").value = car.kml || "";
  $("cEvKwh100").value = car.evKwh100 || "";
  $("cEvRange").value = car.evRange || "";
  $("cSeats").value = car.seats || 5;
  $("cTransmission").value = car.transmission || "Automática";
  $("cAirbags").value = car.airbags || 2;
  $("cWarrantyYears").value = car.warrantyYears || 3;
  $("cWarrantyKm").value = car.warrantyKm || 100000;
  $("cOrigin").value = car.origin || "";
  $("cSafetyStars").value = car.safetyStars || "";
  $("cancelEditBtn").style.display = "inline-block";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

$("cancelEditBtn").addEventListener("click", resetForm);

function resetForm() {
  $("formTitle").textContent = "Agregar auto";
  $("cEditId").value = "";
  $("cId").disabled = false;
  document.querySelectorAll(".car-form input").forEach((i) => (i.value = ""));
  $("cSeats").value = 5;
  $("cAirbags").value = 2;
  $("cWarrantyYears").value = 3;
  $("cWarrantyKm").value = 100000;
  $("cancelEditBtn").style.display = "none";
}

$("saveCarBtn").addEventListener("click", async () => {
  const editing = !!$("cEditId").value;
  const car = {
    id: $("cId").value.trim(),
    name: $("cName").value.trim(),
    brand: $("cBrand").value.trim(),
    segment: $("cSegment").value.trim(),
    type: $("cType").value,
    price: parseFloat($("cPrice").value) || 0,
    kwh100: parseFloat($("cKwh100").value) || undefined,
    kml: parseFloat($("cKml").value) || undefined,
    evKwh100: parseFloat($("cEvKwh100").value) || undefined,
    evRange: parseFloat($("cEvRange").value) || undefined,
    seats: parseInt($("cSeats").value) || 5,
    transmission: $("cTransmission").value,
    airbags: parseInt($("cAirbags").value) || 2,
    warrantyYears: parseInt($("cWarrantyYears").value) || 3,
    warrantyKm: parseInt($("cWarrantyKm").value) || 100000,
    origin: $("cOrigin").value.trim(),
    safetyStars: parseInt($("cSafetyStars").value) || null,
    dealerCity: "Santiago",
    dealerName: "Por confirmar",
    image: "",
    approxPrice: false,
  };

  if (!car.id || !car.name || !car.price) {
    alert("ID, nombre y precio son obligatorios.");
    return;
  }

  const url = editing ? `/api/admin/cars/${car.id}` : "/api/admin/cars";
  const method = editing ? "PUT" : "POST";
  const res = await authFetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(car),
  });

  if (!res.ok) {
    const data = await res.json();
    alert("Error: " + (data.error || "no se pudo guardar"));
    return;
  }

  resetForm();
  loadCars();
});

async function deleteCar(id) {
  if (!confirm("¿Eliminar este auto del catálogo?")) return;
  await authFetch(`/api/admin/cars/${id}`, { method: "DELETE" });
  loadCars();
}
