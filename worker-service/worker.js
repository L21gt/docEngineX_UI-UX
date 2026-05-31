const { Worker } = require("bullmq");
const puppeteer = require("puppeteer");
const handlebars = require("handlebars");
const fs = require("fs-extra");
const path = require("path");
const AWS = require("aws-sdk");
const db = require("../backend-api/db");
require("dotenv").config();

// Configuración de AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

/**
 * Procesa la generación de PDF y subida a S3
 * @param {Object} job - Datos de la tarea provenientes de BullMQ
 */
const processDocument = async (job) => {
  const { docId, templateType, payload } = job.data;
  let browser;

  try {
    // 1. Actualizar estado a 'processing' en Postgres
    await db.query("UPDATE Public_Documents SET status = $1 WHERE id = $2", [
      "processing",
      docId,
    ]);
    console.log(`Procesando documento: ${docId}`);

    // 2. Cargar plantilla Handlebars y compilar
    const templatePath = path.join(__dirname, "templates", "document.hbs");
    const htmlContent = await fs.readFile(templatePath, "utf-8");
    const template = handlebars.compile(htmlContent);

    // Preparamos los datos para la plantilla (incluyendo tablas dinámicas)
    const finalHtml = template({
      id: docId,
      template_type: templateType,
      date: new Date().toLocaleDateString(),
      custom_html: generateTableHtml(payload), // Función auxiliar para el JSON
    });

    // 3. Generar PDF con Puppeteer
    browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.setContent(finalHtml, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "Letter",
      printBackground: true,
    });
    await browser.close();

    // 4. Subir a AWS S3
    const uploadParams = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: `documents/${docId}.pdf`,
      Body: pdfBuffer,
      ContentType: "application/pdf",
      ACL: "public-read", // Para que sea accesible públicamente
    };

    const uploadResult = await s3.upload(uploadParams).promise();

    // 5. Finalizar: Actualizar base de datos a 'completed'
    await db.query(
      "UPDATE Public_Documents SET status = $1, file_url = $2 WHERE id = $3",
      ["completed", uploadResult.Location, docId],
    );

    console.log(`Documento completado: ${uploadResult.Location}`);
  } catch (error) {
    console.error(`Error procesando documento ${docId}:`, error);
    // Si falla, guardamos el error en la BD para auditoría
    await db.query(
      "UPDATE Public_Documents SET status = $1, error_reason = $2 WHERE id = $3",
      ["failed", error.message, docId],
    );
  }
};

// Función auxiliar para crear tablas dinámicas desde el JSON
function generateTableHtml(data) {
  if (!data.items) return "<p>No hay datos disponibles</p>";
  let rows = data.items
    .map(
      (item) =>
        `<tr><td>${item.description}</td><td>${item.quantity}</td><td>$${item.price}</td></tr>`,
    )
    .join("");
  return `<table><thead><tr><th>Descripción</th><th>Cant.</th><th>Precio</th></tr></thead><tbody>${rows}</tbody></table>`;
}

// Iniciar el Worker escuchando la cola 'document-job'
const worker = new Worker("document-job", processDocument, {
  connection: {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: process.env.REDIS_PORT || 6379,
  },
});

console.log("Worker de DocEngine-X esperando tareas...");
