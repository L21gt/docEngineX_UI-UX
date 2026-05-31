const DocumentService = require("../services/document.service");

/**
 * @fileoverview Controlador para el manejo de endpoints relacionados con documentos.
 * Responsable de la validación inicial de HTTP, extracción de DTOs y manejo de respuestas.
 */

const generateDocument = async (req, res) => {
  const { template_type, data } = req.body;

  try {
    // Delegar la lógica pesada a la capa de servicio
    const newDoc = await DocumentService.queueDocumentGeneration(
      template_type,
      data,
    );

    // Respuesta no bloqueante recomendada para arquitecturas dirigidas por eventos
    res.status(202).json({
      message: "Documento en cola de procesamiento",
      jobId: newDoc.id,
      status: newDoc.status,
    });
  } catch (error) {
    console.error("Error en DocumentController.generateDocument:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

/**
 * Recupera el historial de documentos para poblar la tabla del Dashboard.
 */
const getDocuments = async (req, res) => {
  try {
    const documents = await DocumentService.getAllDocuments();
    res.status(200).json(documents);
  } catch (error) {
    console.error("Error en DocumentController.getDocuments:", error);
    res.status(500).json({ error: "Error interno al obtener el historial" });
  }
};

module.exports = {
  generateDocument,
  getDocuments,
};
