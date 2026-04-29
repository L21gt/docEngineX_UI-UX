const express = require("express");
const cors = require("cors");
const { Queue } = require("bullmq");
const db = require("./db"); // Importamos nuestra conexión a Postgres
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json()); // Permite procesar datos JSON enviados por el cliente

// Configuración de la cola de tareas (Broker: Redis)
// Esta cola es la que el Worker escuchará para procesar los documentos
const documentQueue = new Queue("document-job", {
  connection: {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: process.env.REDIS_PORT || 6379,
    maxRetriesPerRequest: null,
  },
});

// Evento para monitorear errores de la cola
documentQueue.on("error", (err) => {
  console.error("Error en la cola Redis:", err.message);
});

// Ruta principal: Recibe JSON y genera el registro de documento
app.post("/generate", async (req, res) => {
  const { template_type, data } = req.body;

  try {
    // 1. Guardar el registro inicial en PostgreSQL usando SQL puro
    // El estado por defecto es 'queued' según nuestro esquema
    const queryText = `
            INSERT INTO Public_Documents (template_type, json_data)
            VALUES ($1, $2)
            RETURNING id, status;
        `;
    const values = [template_type, JSON.stringify(data)];
    const result = await db.query(queryText, values);

    const newDoc = result.rows[0];

    // 2. Añadir la tarea a la cola de BullMQ para que el Worker la procese
    // Pasamos el ID del documento para que el Worker sepa qué registro actualizar
    await documentQueue.add("document-job", {
      docId: newDoc.id,
      templateType: template_type,
      payload: data,
    });

    // 3. Respuesta inmediata al cliente (202 Accepted)
    // Esto garantiza que la API no se bloquee por tareas pesadas
    res.status(202).json({
      message: "Documento en cola de procesamiento",
      jobId: newDoc.id,
      status: newDoc.status,
    });
  } catch (error) {
    console.error("Error al encolar documento:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API DocEngine-X corriendo en puerto ${PORT}`);
});
