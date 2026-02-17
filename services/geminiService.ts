import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const refineTextWithAI = async (
  originalText: string,
  instruction: string,
  sectionName: string
): Promise<string> => {
  try {
    const prompt = `
      Tu es un expert en communication politique pour une élection municipale en France.
      Ton objectif est d'améliorer un texte pour une fiche de présentation de candidat.
      La liste s'appelle "Une alternative pour Domessin".
      Le ton doit être : Sobre, institutionnel, professionnel, positif et engageant.
      
      Section concernée : "${sectionName}"
      Texte original : "${originalText}"
      
      Instruction de modification de l'utilisateur : "${instruction}"
      
      Renvoie uniquement le texte réécrit, sans guillemets ni phrases d'introduction.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 } 
      }
    });

    return response.text?.trim() || originalText;
  } catch (error) {
    console.error("Error calling Gemini:", error);
    throw new Error("Impossible de contacter l'IA pour le moment.");
  }
};