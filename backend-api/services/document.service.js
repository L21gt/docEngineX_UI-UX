const db = require("../db");
const documentQueue = require("../config/queue");

/**
 * @class DocumentService
 * @description Encapsula la lógica de negocio para la gestión de documentos.
 * Interactúa directamente con la capa de persistencia (PostgreSQL) y el broker (Redis).
 */
class DocumentService {
  /**
   * Registra un nuevo documento y encola la tarea de procesamiento.
   * @param {string} templateType - Tipo de plantilla (ej. 'invoice').
   * @param {Object} data - Payload en formato JSON.
   * @returns {Object} Registro insertado en la base de datos.
   */
  static async queueDocumentGeneration(templateType, data) {
    // Inserción transaccional inicial
    const queryText = `
        INSERT INTO Public_Documents (template_type, json_data)
        VALUES ($1, $2)
        RETURNING id, status;
    `;
    const values = [templateType, JSON.stringify(data)];
    const result = await db.query(queryText, values);
    const newDoc = result.rows[0];

    // Despacho de la tarea asíncrona al worker
    await documentQueue.add("document-job", {
      docId: newDoc.id,
      templateType: templateType,
      payload: data,
    });

    return newDoc;
  }
}

module.exports = DocumentService;
