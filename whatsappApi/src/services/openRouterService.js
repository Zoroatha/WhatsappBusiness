import axios from "axios";
import config from "./config/env.js";

class OpenRouterService {
  constructor() {
    this.apiKey = config.OPENROUTER_API_KEY;
    this.baseURL = "https://openrouter.ai/api/v1";
    this.model = "deepseek/deepseek-chat"; // Modelo económico y eficiente

    if (!this.apiKey) {
      console.warn("⚠️ OpenRouter API key not configured");
    } else {
      console.log("✅ OpenRouter service initialized");
    }
  }

  /**
   * ✅ Verificar si el servicio está disponible
   */
  isAvailable() {
    return !!this.apiKey;
  }

  /**
   * ✅ Generar respuesta usando OpenRouter con DeepSeek
   */
  async generateResponse(
    userMessage,
    userName = "Usuario",
    systemPrompt = null
  ) {
    if (!this.isAvailable()) {
      throw new Error("OpenRouter service not configured - missing API key");
    }

    try {
      console.log(`🤖 Generating AI response for: ${userName}`);
      console.log(`📝 User message: ${userMessage.substring(0, 100)}...`);

      const defaultSystemPrompt = `Eres un asistente médico virtual profesional y amigable de una clínica/farmacia llamada ZoroathaProject. 

INSTRUCCIONES:
- Responde en español de manera clara y profesional
- Proporciona información médica general y educativa
- Para consultas específicas, recomienda siempre consultar a un profesional
- Sé empático y comprensivo
- Mantén respuestas concisas pero informativas (máximo 300 palabras)
- No diagnósticos médicos específicos, solo información general
- Si no sabes algo, admítelo y recomienda consultar al médico

El usuario se llama: ${userName}`;

      const messages = [
        {
          role: "system",
          content: systemPrompt || defaultSystemPrompt,
        },
        {
          role: "user",
          content: userMessage,
        },
      ];

      const response = await axios({
        method: "POST",
        url: `${this.baseURL}/chat/completions`,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        data: {
          model: this.model,
          messages: messages,
          max_tokens: 500, // Limitar respuesta
          temperature: 0.7,
          top_p: 0.9,
        },
        timeout: 30000, // 30 segundos timeout
      });

      const aiMessage = response.data.choices[0]?.message?.content;

      if (!aiMessage) {
        throw new Error("Empty response from AI service");
      }

      console.log(`✅ AI response generated successfully`);
      console.log(`📝 Response preview: ${aiMessage.substring(0, 100)}...`);

      return aiMessage.trim();
    } catch (error) {
      console.error("❌ Error generating AI response:", error.message);

      // ✅ Mejor manejo de errores específicos
      if (error.response?.status === 401) {
        throw new Error("Invalid OpenRouter API key");
      } else if (error.response?.status === 429) {
        throw new Error("API rate limit exceeded, please try again later");
      } else if (error.response?.status === 500) {
        throw new Error("AI service temporarily unavailable");
      } else if (error.code === "ECONNABORTED") {
        throw new Error("AI service timeout - please try again");
      } else {
        throw new Error(`AI service error: ${error.message}`);
      }
    }
  }

  /**
   * ✅ Verificar estado del servicio
   */
  async healthCheck() {
    if (!this.isAvailable()) {
      return { status: "disabled", message: "API key not configured" };
    }

    try {
      // Test simple para verificar conectividad
      const testResponse = await this.generateResponse(
        "Hello, this is a health check",
        "System",
        'Respond with exactly: "Health check successful"'
      );

      return {
        status: "healthy",
        message: "OpenRouter service operational",
        model: this.model,
        response: testResponse,
      };
    } catch (error) {
      return {
        status: "unhealthy",
        message: `Service error: ${error.message}`,
      };
    }
  }

  /**
   * ✅ Respuesta de fallback cuando el servicio no está disponible
   */
  getFallbackResponse(userMessage) {
    const fallbackResponses = [
      "Lo siento, el servicio de asistente inteligente no está disponible temporalmente. Por favor, contacta directamente a nuestro personal médico para una consulta profesional.",
      "Disculpa, no puedo procesar tu consulta en este momento. Te recomiendo que contactes a nuestra clínica para recibir atención personalizada.",
      "El asistente virtual está temporalmente fuera de servicio. Para consultas médicas urgentes, comunícate directamente con nosotros al +57 3002726932.",
    ];

    // Seleccionar respuesta aleatoria
    const randomIndex = Math.floor(Math.random() * fallbackResponses.length);
    return fallbackResponses[randomIndex];
  }

  /**
   * ✅ Generar respuesta con fallback automático
   */
  async generateResponseWithFallback(
    userMessage,
    userName = "Usuario",
    systemPrompt = null
  ) {
    try {
      return await this.generateResponse(userMessage, userName, systemPrompt);
    } catch (error) {
      console.warn(
        "⚠️ AI service failed, using fallback response:",
        error.message
      );
      return this.getFallbackResponse(userMessage);
    }
  }
}

// ✅ Exportar instancia única
export default new OpenRouterService();
