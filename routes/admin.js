const express = require("express");
const router = express.Router();
const store = require("../data/store");

// ---- Basic Auth middleware ----
function basicAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, encoded] = header.split(" ");

  if (scheme !== "Basic" || !encoded) {
    res.set("WWW-Authenticate", 'Basic realm="Admin"');
    return res.status(401).send("Autenticación requerida.");
  }

  const decoded = Buffer.from(encoded, "base64").toString("utf-8");
  const [user, pass] = decoded.split(":");

  const validUser = process.env.ADMIN_USER || "admin";
  const validPass = process.env.ADMIN_PASS || "admin";

  if (user === validUser && pass === validPass) {
    return next();
  }

  res.set("WWW-Authenticate", 'Basic realm="Admin"');
  return res.status(401).send("Credenciales inválidas.");
}

router.use(basicAuth);

// ---- Leads ----
router.get("/leads", (req, res) => {
  res.json(store.getLeads());
});

router.patch("/leads/:id/status", (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: "Falta el nuevo estado (status)." });
  const updated = store.updateLeadStatus(req.params.id, status);
  if (!updated) return res.status(404).json({ error: "Lead no encontrado." });
  res.json(updated);
});

// ---- Cars (CRUD simple para cargar/actualizar inventario) ----
router.get("/cars", (req, res) => {
  res.json(store.getCars());
});

router.post("/cars", (req, res) => {
  const car = req.body;
  if (!car.id || !car.name || !car.type || !car.price) {
    return res.status(400).json({ error: "Faltan campos obligatorios: id, name, type, price." });
  }
  const saved = store.upsertCar(car);
  res.status(201).json(saved);
});

router.put("/cars/:id", (req, res) => {
  const car = { ...req.body, id: req.params.id };
  const saved = store.upsertCar(car);
  res.json(saved);
});

router.delete("/cars/:id", (req, res) => {
  store.deleteCar(req.params.id);
  res.status(204).end();
});

module.exports = router;
