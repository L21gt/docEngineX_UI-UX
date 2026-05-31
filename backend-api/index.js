const express = require("express");
const cors = require("cors");
require("dotenv").config();

const documentRoutes = require("./routes/document.routes");

const app = express();
app.use(cors());
app.use(express.json());

// Middleware de registro (Logger de tráfico HTTP)
app.use((req, res, next) => {
  console.log(`Petición recibida: ${req.method} ${req.url}`);
  next();
});

// Integración del router modular
// Montamos las rutas en la raíz para mantener la compatibilidad con el endpoint /generate
app.use("/", documentRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API DocEngine-X corriendo de forma modular en puerto ${PORT}`);
});
