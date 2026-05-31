const { Queue } = require("bullmq");
require("dotenv").config();

/**
 * @fileoverview Configuración del broker de mensajería (Redis).
 * Se aísla la instancia de BullMQ para permitir inyección de dependencias
 * o mockeos sencillos en la capa de testing sin instanciar todo el servidor.
 */

const documentQueue = new Queue("document-job", {
  connection: {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: process.env.REDIS_PORT || 6379,
    maxRetriesPerRequest: null,
  },
});

documentQueue.on("error", (err) => {
  console.error("Error en la cola Redis:", err.message);
});

module.exports = documentQueue;
