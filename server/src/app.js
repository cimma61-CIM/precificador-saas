const express = require("express");
const cors = require("cors");
const calculoRoutes = require("./routes/calculoRoutes");

const app = express();

// 🔥 MUITO IMPORTANTE: CORS vem antes das rotas
app.use(cors());

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Precificador SaaS API rodando 🚀");
});

app.use(calculoRoutes);

module.exports = app;