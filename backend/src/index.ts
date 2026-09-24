import express from "express";
import cors from "cors";
import { config } from "./config/index.js";
import { router } from "./routes/index.js";

const app = express();

// Middlewares globales
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Rutas de la API
app.use("/api", router);

// Manejador global de errores
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled Error:", err);
  res.status(500).json({
    error: err.message || "Error interno del servidor",
  });
});

const PORT = config.port;
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Lojafac SRI Backend API corriendo en puerto ${PORT}`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`📦 Base de Datos: Neon PostgreSQL`);
  console.log(`=======================================================`);
});

export default app;
