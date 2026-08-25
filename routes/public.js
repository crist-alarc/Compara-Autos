const express = require("express");
const router = express.Router();
const store = require("../data/store");

// GET /api/cars - listado completo (el frontend filtra en el cliente, el catálogo es chico)
router.get("/cars", (req, res) => {
  res.json(store.getCars());
});

// GET /api/cars/:id
router.get("/cars/:id", (req, res) => {
  const car = store.getCarById(req.params.id);
  if (!car) return res.status(404).json({ error: "Auto no encontrado" });
  res.json(car);
});

// POST /api/leads - captura de contacto hacia el concesionario
router.post("/leads", (req, res) => {
  const { carId, name, phone, email, comuna, message } = req.body;

  if (!carId || !name || !phone) {
    return res.status(400).json({ error: "Faltan datos obligatorios: carId, name y phone son requeridos." });
  }

  const car = store.getCarById(carId);
  if (!car) {
    return res.status(404).json({ error: "El auto seleccionado no existe." });
  }

  const lead = store.addLead({
    carId,
    carName: car.name,
    name,
    phone,
    email: email || "",
    comuna: comuna || "",
    message: message || "",
  });

  res.status(201).json({ ok: true, lead });
});

module.exports = router;
