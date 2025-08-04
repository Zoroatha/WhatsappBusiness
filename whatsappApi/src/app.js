import express from "express";
import config from "./config/env.js";
import webhookRoutes from "./routes/webhookRoutes.js";

const app = express();

app.use(express.json());

app.use("/", webhookRoutes);

app.get("/", (req, res) => {
  res.send(`<pre>Nothing to see here.
Checkout README.md to start.</pre>`);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection:", reason);
});

setInterval(() => {
  console.log("Bot is alive...");
}, 15000); // cada 15 segundos

console.log("Env config:", config);
console.log("Webhook route initialized");

app.listen(PORT, () => {
  console.log(`Server is listening on port:  ${PORT}`);
});
