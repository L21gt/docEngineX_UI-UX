const express = require("express");
const router = express.Router();
const documentController = require("../controllers/document.controller");

/**
 * Definición de endpoints de la API REST para el recurso 'Documents'.
 */

router.post("/generate", documentController.generateDocument);

module.exports = router;
