// routes/webhookRoutes.js
import express from "express";
import webhookController from "../controllers/webhookController.js";

const router = express.Router();

// Ruta para verificación con Meta (GET)
router.get("/webhook", webhookController.verifyWebhook);

// Ruta para recibir eventos entrantes (POST)
router.post("/webhook", webhookController.handleIncoming);

export default router;
