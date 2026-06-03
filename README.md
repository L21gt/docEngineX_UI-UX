# DocEngine-X

Un sistema distribuido para la generación asíncrona de documentos (JSON a PDF) con notificaciones en tiempo real y almacenamiento en la nube.

Este proyecto implementa una arquitectura orientada a microservicios separando la ingesta de datos, el procesamiento pesado y la capa de presentación para garantizar alta disponibilidad y escalabilidad.

---

## 🚀 Tecnologías y Arquitectura

- **Frontend:** React.js, Socket.io-client, CSS Puro.
- **Backend API:** Node.js, Express, Socket.io (Clean Architecture).
- **Worker Service:** Node.js, BullMQ, Puppeteer, Handlebars.
- **Bases de Datos & Infraestructura:** PostgreSQL (Persistencia), Redis (Message Broker / Cola de tareas), AWS S3 (Cloud Storage).
- **DevOps:** Docker & Docker Compose, GitHub Actions (CI/CD), Jest (Testing >80% coverage).

---

## ⚙️ Características Principales

- **Procesamiento Asíncrono:** La API delega la generación de PDFs a un Worker independiente mediante Redis, respondiendo inmediatamente al cliente (HTTP 202 Accepted) sin bloquear el hilo principal.
- **Notificaciones Real-Time:** Conexión vía WebSockets que actualiza el estado de los documentos en el Dashboard (`queued` → `processing` → `completed` / `failed`) sin necesidad de recargar la página.
- **Tolerancia a Fallos:** Manejo estricto de errores (Sad Paths) con registro de auditoría en base de datos en caso de fallos en la renderización o caídas de servicios externos (AWS).
- **Almacenamiento en la Nube:** Subida automática de los PDFs generados a un bucket público de Amazon S3 utilizando credenciales IAM con el principio de menor privilegio.

---

## 🛠️ Requisitos Previos

Asegúrate de tener instalados los siguientes componentes en tu entorno local:

- Node.js (v18 o superior)
- Docker y Docker Compose
- Cuenta de AWS (Credenciales IAM con acceso a S3)

---

## 📦 Variables de Entorno

Debes crear un archivo `.env` en las carpetas `backend-api` y `worker-service` con la siguiente estructura:

| Variable                | Descripción                      | Ejemplo               |
| :---------------------- | :------------------------------- | :-------------------- |
| `PORT`                  | Puerto de ejecución del servicio | `3000`                |
| `DB_USER`               | Usuario de PostgreSQL            | `postgres`            |
| `DB_PASSWORD`           | Contraseña de la base de datos   | `tu_password`         |
| `DB_HOST`               | Host de la base de datos         | `127.0.0.1`           |
| `DB_PORT`               | Puerto de PostgreSQL             | `5432`                |
| `DB_NAME`               | Nombre de la base de datos       | `docengine_db`        |
| `REDIS_HOST`            | Host del contenedor Redis        | `127.0.0.1`           |
| `REDIS_PORT`            | Puerto de Redis                  | `6379`                |
| `AWS_ACCESS_KEY_ID`     | Llave de acceso IAM              | `AKIA...`             |
| `AWS_SECRET_ACCESS_KEY` | Llave secreta IAM                | `...`                 |
| `AWS_REGION`            | Región del bucket S3             | `us-east-1`           |
| `AWS_S3_BUCKET`         | Nombre del bucket                | `mi-bucket-docengine` |

_Nota para el Frontend:_ En la carpeta `frontend-dashboard`, crea un archivo `.env` con `PORT=3001` para evitar colisiones con la API.

---

## 🚀 Instalación y Ejecución Local

**1. Levantar la Infraestructura (Bases de Datos)**

```bash
docker-compose up -d
```

**2. Iniciar la API Backend**

```bash
cd backend-api
npm install
npm start
```

**3. Iniciar el Microservicio Worker (En una terminal separada)**

```bash
cd worker-service
npm install
npm start
```

**4. Iniciar el Dashboard Frontend (En una terminal separada)**

```bash
cd frontend-dashboard
npm install
npm start
```

## 🧪 Pruebas Unitarias y Cobertura

El proyecto cuenta con una suite de pruebas automatizadas utilizando Jest y Supertest, integradas en un pipeline de GitHub Actions que exige un mínimo del 80% de cobertura para aprobar despliegues.

Para ejecutar las pruebas localmente:

```bash
cd backend-api
npm test
```
