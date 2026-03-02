const express = require("express");
const router = express.Router();
const calculoController = require("../controllers/calculoController");

router.post("/calcular", calculoController.calcularPreco);

module.exports = router;