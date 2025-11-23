import { GoogleGenAI, Type, Schema } from "@google/genai";
import { DocType, ExtractedData } from "../types";

// Using a singleton pattern or simple export for the service
// In a real extension, this would verify the API key exists in storage.

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    documentType: {
      type: Type.STRING,
      enum: [DocType.INVOICE, DocType.PURCHASE_ORDER, DocType.QUOTE, DocType.OTHER],
      description: "The classification of the document.",
    },
    senderName: {
      type: Type.STRING,
      description: "The name of the company or person sending the document.",
    },
    senderEmail: {
      type: Type.STRING,
      description: "The email address found in the document header or contact info. If not found, infer from sender name or leave empty.",
    },
    totalAmount: {
      type: Type.NUMBER,
      description: "The final total value of the document in numbers only.",
    },
    currency: {
      type: Type.STRING,
      description: "The currency code (e.g., INR, USD). Default to INR if symbol is ₹.",
    },
    summary: {
      type: Type.STRING,
      description: "A very brief 10-word summary of what this document is for.",
    }
  },
  required: ["documentType", "senderName", "totalAmount", "currency"],
};

export const analyzeDocument = async (
  fileBase64: string,
  mimeType: string,
  fileName: string
): Promise<Partial<ExtractedData> | null> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: fileBase64,
            },
          },
          {
            text: `Analyze this document (File name: ${fileName}). 
            Identify if it is an Invoice, Purchase Order, or Quote. 
            Extract the Sender Name, Sender Email, and the Total Amount.
            If the value is in Rupees, ensure currency is INR.`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        systemInstruction: "You are an expert automated document processing agent. You only care about Invoices, POs, and Quotes.",
      },
    });

    const text = response.text;
    if (!text) return null;

    const result = JSON.parse(text);

    return {
      type: result.documentType as DocType,
      senderName: result.senderName,
      senderEmail: result.senderEmail || "Unknown",
      amount: result.totalAmount,
      currency: result.currency,
      summary: result.summary,
    };

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

// Helper to convert File to Base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the "data:*/*;base64," prefix
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};
