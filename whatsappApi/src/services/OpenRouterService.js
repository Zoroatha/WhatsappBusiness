// services/openRouterService.js
import axios from "axios";

/**
 * Servicio para conectarse con la API de OpenRouter usando el modelo automático gratuito.
 */
const openRouterService = {
  async generateResponse(prompt) {
    try {
      const response = await axios({
        method: "POST",
        url: "https://openrouter.ai/api/v1/chat/completions",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://tuweb.com", // Cambia por tu dominio
          "X-Title": "whatsapp-bot-ai",
        },
        data: {
          model: "openrouter/auto",
          messages: [
            {
              role: "system",
              content: "Eres un asistente experto, útil, breve y preciso.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 500,
        },
      });

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error(
        "Error en openRouterService.generateResponse:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  async generateContextualResponse(prompt, userName, context = "") {
    const fullContext = `${context}\nUsuario: ${userName}`;
    return this.generateResponse(fullContext + "\n\n" + prompt);
  },
};

export default openRouterService;
