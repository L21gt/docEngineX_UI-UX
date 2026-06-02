import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
import "./App.css";

const socket = io("http://127.0.0.1:3000");

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [jsonInput, setJsonInput] = useState(
    '{\n  "items": [\n    {"description": "Servicio de Consultoría", "quantity": 1, "price": 1000}\n  ]\n}',
  );
  const [templateType, setTemplateType] = useState("invoice");

  // Nuevo estado para controlar los filtros de auditoría
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    socket.on("connect", () => setIsConnected(true));
    socket.on("disconnect", () => setIsConnected(false));

    fetchDocuments();

    socket.on("document_status_change", (data) => {
      const { jobId, status } = data;

      setDocuments((prevDocs) =>
        prevDocs.map((doc) =>
          doc.id === jobId ? { ...doc, status: status } : doc,
        ),
      );

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

  const fetchDocuments = async () => {
    try {
      const response = await fetch("http://localhost:3000/list");
      const data = await response.json();
      setDocuments(data);
    } catch (error) {
      console.error("Error obteniendo el historial:", error);
    }
  };

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
        fetchDocuments();
      }
    } catch (error) {
      console.error("Error enviando petición:", error);
    }
  };

  // Lógica de filtrado antes de renderizar la tabla
  const filteredDocuments = documents.filter((doc) => {
    if (filterStatus === "all") return true;
    return doc.status === filterStatus;
  });

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

        <section className="panel">
          <h2>Historial Público</h2>

          {/* Implementación de Filtros de Auditoría */}
          <div className="filter-section">
            <label>Filtrar por estado:</label>
            <select
              className="form-control"
              style={{ width: "auto" }}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">Todos los documentos</option>
              <option value="completed">Completados</option>
              <option value="processing">En proceso</option>
              <option value="queued">En cola</option>
              <option value="failed">Fallidos (Auditoría)</option>
            </select>
          </div>

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
                {/* Renderizamos el array filtrado en lugar del original */}
                {filteredDocuments.map((doc) => (
                  <tr key={doc.id}>
                    <td title={doc.id}>{doc.id.substring(0, 8)}...</td>
                    <td>{doc.template_type}</td>
                    <td>{new Date(doc.created_at).toLocaleDateString()}</td>
                    <td>
                      <span className={`status-indicator status-${doc.status}`}>
                        {doc.status}
                      </span>
                      {/* Cumplimiento del diagrama: Spinner visual para 'processing' */}
                      {doc.status === "processing" && (
                        <div
                          className="spinner"
                          title="Procesando documento"
                        ></div>
                      )}
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

                {/* Mensaje amigable si el filtro no encuentra resultados */}
                {filteredDocuments.length === 0 && (
                  <tr>
                    <td
                      colSpan="5"
                      style={{ textAlign: "center", padding: "20px" }}
                    >
                      No hay documentos que coincidan con este filtro.
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
