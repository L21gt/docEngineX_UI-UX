// Importamos el cliente de PostgreSQL
const { Pool } = require("pg");
require("dotenv").config();

/**
 * Configuración del Pool de conexiones.
 * Usamos un Pool en lugar de un cliente único para manejar múltiples
 * consultas de forma eficiente en un entorno de producción.
 */
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Comprobación técnica de la conexión inicial
pool.on("connect", () => {
  console.log("Base de datos conectada exitosamente");
});

pool.on("error", (err) => {
  console.error("Error inesperado en el pool de Postgres", err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};
