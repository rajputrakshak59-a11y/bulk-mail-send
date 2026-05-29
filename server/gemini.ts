import { GoogleGenAI } from "@google/genai";

async function createAIEmailTemplate(promptInput: string): Promise<{subject: string, body: string}> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not defined");
  }

  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });

  const structuredPrompt = `Write a high-converting cold email pitch. The user requested: "${promptInput}".
You MUST respect the placeholder "{name}" which will be replaced with the recipient client's name dynamically.
Provide the output strictly as a JSON object with keys "subject" and "body". Do not wrap the JSON output in markdown backticks.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: structuredPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT" as any,
          properties: {
            subject: { type: "STRING" as any, description: "Highly engaging, clickable subject line" },
            body: { type: "STRING" as any, description: "Persuasive email body, containing greeting with {name} placeholder" }
          },
          required: ["subject", "body"]
        }
      }
    });

    if (response.text) {
      const parsed = JSON.parse(response.text.trim());
      return {
        subject: parsed.subject || "Greetings {name}",
        body: parsed.body || `Hello {name}, we would like to reach out to you.`
      };
    }
  } catch (error) {
    console.error("Gemini writing engine exception:", error);
  }

  return {
    subject: "Greetings {name}",
    body: `Hello {name},\n\nWe would love to connect with you regarding our platform solutions.\n\nBest Regards.`
  };
}

export { createAIEmailTemplate };
