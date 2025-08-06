// routes/webhookRoutes.js
import express from "express";
import webhookController from "../controllers/webhookController.js";

const router = express.Router();

// Ruta para verificación con Meta (GET)
router.get("/", webhookController.verifyWebhook);

// Ruta para recibir eventos entrantes (POST)
router.post("/", webhookController.handleIncoming);

export default router;
