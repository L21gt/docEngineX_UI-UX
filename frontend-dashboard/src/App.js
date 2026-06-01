import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
import "./App.css";

/**
 * @fileoverview Componente principal del Dashboard.
 * Gestiona el envío de JSON, la visualización del historial y las actualizaciones en tiempo real.
 */

const socket = io("http://127.0.0.1:3000");

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [jsonInput, setJsonInput] = useState(
    '{\n  "items": [\n    {"description": "Servicio de Consultoría", "quantity": 1, "price": 1000}\n  ]\n}',
  );
  const [templateType, setTemplateType] = useState("invoice");

  // 1. Efecto de Inicialización y WebSockets
  useEffect(() => {
    socket.on("connect", () => setIsConnected(true));
    socket.on("disconnect", () => setIsConnected(false));

    // Cargar historial inicial desde la API Rest
    fetchDocuments();

    // Suscripción al evento de cambio de estado emitido por BullMQ + Express
    socket.on("document_status_change", (data) => {
      const { jobId, status } = data;

      // Actualizamos el estado de inmutabilidad en React para forzar un re-render de la fila afectada
      setDocuments((prevDocs) =>
        prevDocs.map((doc) =>
          doc.id === jobId ? { ...doc, status: status } : doc,
        ),
      );

      // Si se completó, volvemos a hacer fetch para obtener la URL del S3
      if (status === "completed") {
        fetchDocuments();
      }
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("document_status_change");
    };
  }, []);

  /**
   * Obtiene el historial de documentos públicos.
   */
  const fetchDocuments = async () => {
    try {
      const response = await fetch("http://localhost:3000/list");
      const data = await response.json();
      setDocuments(data);
    } catch (error) {
      console.error("Error obteniendo el historial:", error);
    }
  };

  /**
   * Maneja el envío del formulario, validando el JSON antes de despachar.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    let parsedData;

    try {
      parsedData = JSON.parse(jsonInput);
    } catch (error) {
      alert(
        "Error: El formato JSON es inválido. Por favor revisa la sintaxis.",
      );
      return;
    }

    try {
      const response = await fetch("http://localhost:3000/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_type: templateType,
          data: parsedData,
        }),
      });

      if (response.ok) {
        // Recargamos rápido para que el nuevo documento aparezca como "queued" en la tabla
        fetchDocuments();
      }
    } catch (error) {
      console.error("Error enviando petición:", error);
    }
  };

  return (
    <div className="dashboard-container">
      <header className="header">
        <h1>DocEngine-X Dashboard</h1>
        <p>
          Estado del servidor:{" "}
          <span
            className={
              isConnected
                ? "status-indicator status-completed"
                : "status-indicator status-queued"
            }
          >
            {isConnected ? "Conectado (Real-Time Activo)" : "Desconectado"}
          </span>
        </p>
      </header>

      <main className="main-content">
        {/* Panel Izquierdo: Formulario */}
        <section className="panel">
          <h2>Generar Documento</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Tipo de Plantilla</label>
              <select
                className="form-control"
                value={templateType}
                onChange={(e) => setTemplateType(e.target.value)}
              >
                <option value="invoice">Factura (Invoice)</option>
                <option value="certificate">Certificado</option>
              </select>
            </div>
            <div className="form-group">
              <label>Datos (JSON)</label>
              <textarea
                className="form-control textarea-json"
                rows="10"
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
              ></textarea>
            </div>
            <button type="submit" className="btn-submit">
              Poner en Cola
            </button>
          </form>
        </section>

        {/* Panel Derecho: Historial Público */}
        <section className="panel">
          <h2>Historial Público</h2>
          <div className="table-responsive">
            <table className="documents-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Tipo</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th>Archivo</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td title={doc.id}>{doc.id.substring(0, 8)}...</td>
                    <td>{doc.template_type}</td>
                    <td>{new Date(doc.created_at).toLocaleDateString()}</td>
                    <td>
                      <span className={`status-indicator status-${doc.status}`}>
                        {doc.status}
                      </span>
                    </td>
                    <td>
                      {doc.status === "completed" && doc.file_url ? (
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="link-btn"
                        >
                          Ver PDF
                        </a>
                      ) : (
                        <span style={{ color: "#999" }}>-</span>
                      )}
                    </td>
                  </tr>
                ))}
                {documents.length === 0 && (
                  <tr>
                    <td
                      colSpan="5"
                      style={{ textAlign: "center", padding: "20px" }}
                    >
                      No hay documentos en el historial.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
