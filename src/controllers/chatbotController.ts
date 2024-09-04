import { Request, Response } from "express";
import { model, generationConfig } from "../config/chatbotConfig";

const chatSession = model.startChat({
  generationConfig,
  history: [],
});

export const handleChatbotMessage = async (req: Request, res: Response) => {
  try {
    const { message, itemDetails } = req.body;

    const context = `You are Aura, an AI assistant for an auction website. You have information about the following item: ${JSON.stringify(itemDetails)}. Please answer questions about this item. Also, search the web for more info on the product, and remove any unnecessary characters from the chat.`;

    const result = await chatSession.sendMessage(`${context}\n\nHuman: ${message}`);
    const response = result.response.text();

    res.json({ message: response });
  } catch (error) {
    console.error("Error in chatbot:", error);
    res.status(500).json({ message: "An error occurred while processing your request." });
  }
};
