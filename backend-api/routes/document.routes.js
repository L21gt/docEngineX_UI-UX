const express = require("express");
const router = express.Router();
const documentController = require("../controllers/document.controller");

/**
 * Definición de endpoints de la API REST para el recurso 'Documents'.
 */

// Ruta para generar un documento
router.post("/generate", documentController.generateDocument);

// Ruta para obtener el historial
router.get("/list", documentController.getDocuments);

module.exports = router;
