const request = require("supertest");
const express = require("express");
const documentRoutes = require("../routes/document.routes");

/**
 * @fileoverview Pruebas de integración y unitarias para los endpoints de documentos.
 * Se utiliza jest.mock para aislar la lógica de negocio de la capa de infraestructura
 * (Base de datos y Broker de mensajes).
 */

// 1. Mockeamos la base de datos y la cola ANTES de importarlas
jest.mock("../db", () => ({
  query: jest.fn(),
}));

jest.mock("../config/queue", () => ({
  add: jest.fn(),
  on: jest.fn(),
}));

const db = require("../db");
const documentQueue = require("../config/queue");

// 2. Configuramos una instancia limpia de Express para los tests
const app = express();
app.use(express.json());
app.use("/", documentRoutes);

describe("Document API Endpoints", () => {
  // Limpiamos los contadores de los mocks antes de cada test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("POST /generate - Debería registrar el documento, encolarlo y retornar 202", async () => {
    // Preparar el mock: Simulamos que Postgres devuelve un ID y estado 'queued'
    db.query.mockResolvedValue({
      rows: [{ id: "12345678-uuid", status: "queued" }],
    });

    const payload = {
      template_type: "invoice",
      data: { items: [{ description: "Test", quantity: 1, price: 10 }] },
    };

    // Ejecutar la petición con Supertest
    const response = await request(app).post("/generate").send(payload);

    // Verificaciones (Assertions)
    expect(response.status).toBe(202);
    expect(response.body.message).toBe("Documento en cola de procesamiento");
    expect(response.body.jobId).toBe("12345678-uuid");

    // Verificamos que el Servicio hizo su trabajo correctamente
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(documentQueue.add).toHaveBeenCalledWith(
      "document-job",
      expect.objectContaining({
        docId: "12345678-uuid",
        templateType: "invoice",
      }),
    );
  });

  it("POST /generate - Debería retornar 500 si la base de datos falla", async () => {
    // Preparar el mock: Simulamos una caída de la base de datos
    db.query.mockRejectedValue(new Error("Error de conexión a la BD"));

    const response = await request(app).post("/generate").send({
      template_type: "report",
      data: {},
    });

    // Verificaciones del manejo de errores en el Controlador
    expect(response.status).toBe(500);
    expect(response.body.error).toBe("Error interno del servidor");
    // Confirmamos que NO se intentó encolar nada en Redis
    expect(documentQueue.add).not.toHaveBeenCalled();
  });
});
