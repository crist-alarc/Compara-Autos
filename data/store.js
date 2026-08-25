const fs = require("fs");
const path = require("path");

const CARS_PATH = path.join(__dirname, "cars.json");
const LEADS_PATH = path.join(__dirname, "leads.json");

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw || "[]");
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

// ---- Cars ----
function getCars() {
  return readJson(CARS_PATH);
}

function getCarById(id) {
  return getCars().find((c) => c.id === id);
}

function saveCars(cars) {
  writeJson(CARS_PATH, cars);
}

function upsertCar(car) {
  const cars = getCars();
  const idx = cars.findIndex((c) => c.id === car.id);
  if (idx >= 0) {
    cars[idx] = car;
  } else {
    cars.push(car);
  }
  saveCars(cars);
  return car;
}

function deleteCar(id) {
  const cars = getCars().filter((c) => c.id !== id);
  saveCars(cars);
}

// ---- Leads ----
function getLeads() {
  return readJson(LEADS_PATH);
}

function addLead(lead) {
  const leads = getLeads();
  const newLead = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    createdAt: new Date().toISOString(),
    status: "nuevo",
    ...lead,
  };
  leads.unshift(newLead);
  writeJson(LEADS_PATH, leads);
  return newLead;
}

function updateLeadStatus(id, status) {
  const leads = getLeads();
  const idx = leads.findIndex((l) => l.id === id);
  if (idx >= 0) {
    leads[idx].status = status;
    writeJson(LEADS_PATH, leads);
    return leads[idx];
  }
  return null;
}

module.exports = {
  getCars,
  getCarById,
  saveCars,
  upsertCar,
  deleteCar,
  getLeads,
  addLead,
  updateLeadStatus,
};
