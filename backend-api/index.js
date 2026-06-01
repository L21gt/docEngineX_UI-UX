const express = require("express");
const cors = require("cors");
const http = require("http"); // Requerido para integrar Socket.io con Express
const { Server } = require("socket.io");
const { QueueEvents } = require("bullmq"); // Permite escuchar eventos del Worker desde Redis
require("dotenv").config();

const documentRoutes = require("./routes/document.routes");

const app = express();
// Creamos un servidor HTTP puro envolviendo a Express
const server = http.createServer(app);

// Inicializamos Socket.io permitiendo conexiones externas (CORS)
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

// Middleware de registro HTTP
app.use((req, res, next) => {
  console.log(`Petición recibida: ${req.method} ${req.url}`);
  next();
});

// Integración del router
app.use("/", documentRoutes);

// --- INFRAESTRUCTURA DE EVENTOS EN TIEMPO REAL ---

// 1. Escuchar conexiones de clientes Frontend
io.on("connection", (socket) => {
  console.log(`[Socket.io] Nuevo cliente conectado: ${socket.id}`);

  socket.on("disconnect", () => {
    console.log(`[Socket.io] Cliente desconectado: ${socket.id}`);
  });
});

// 2. Conectar BullMQ Events a Redis
const queueEvents = new QueueEvents("document-job", {
  connection: {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: process.env.REDIS_PORT || 6379,
  },
});

// 3. Traducir eventos de Redis a mensajes de WebSocket
queueEvents.on("active", ({ jobId }) => {
  console.log(`[Queue] Job procesando: ${jobId}`);
  // Emitimos el evento a todos los clientes conectados
  io.emit("document_status_change", { jobId, status: "processing" });
});

queueEvents.on("completed", ({ jobId }) => {
  console.log(`[Queue] Job completado: ${jobId}`);
  io.emit("document_status_change", { jobId, status: "completed" });
});
// -------------------------------------------------

const PORT = process.env.PORT || 3000;
// IMPORTANTE: Ahora usamos server.listen en lugar de app.listen para levantar ambos protocolos
server.listen(PORT, () => {
  console.log(`API DocEngine-X + WebSockets corriendo en puerto ${PORT}`);
});
