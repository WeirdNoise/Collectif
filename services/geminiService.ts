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

export const restorePhotoWithAI = async (base64Image: string, mimeType: string): Promise<string> => {
  try {
    const prompt = `
      Analyse cette image et effectue une restauration complète ainsi qu'un rendu de haute qualité pour créer une vignette professionnelle. Applique les étapes suivantes :

      Restauration Physique : Identifie et élimine tous les défauts visibles : rayures, taches, bruits numériques et artefacts de compression. Si l'image est floue, utilise tes capacités de raisonnement pour reconstruire les bords et les textures avec une netteté cristalline.

      Amélioration de la Qualité et Portrait :
      Si un sujet humain est présent, effectue une retouche naturelle de la peau. Conserve les pores et la texture réelle, mais élimine les imperfections mineures.
      Améliore l'éclairage pour simuler une lumière de studio douce (softbox), avec un contraste équilibré et des hautes lumières naturelles.
      Applique une correction colorimétrique pour obtenir des tons vibrants mais réalistes.

      Style de Rendu : Le rendu final doit avoir la qualité d'une photographie prise avec un appareil haut de gamme (type Canon EOS R5, objectif 85mm f/1.2). Utilise un léger effet de profondeur de champ (bokeh) pour isoler le sujet de l'arrière-plan.

      Formatage de Vignette : Cadre le sujet de manière centrale et équilibrée. Le résultat doit être optimisé pour un affichage en haute résolution (minimum 2048px).

      Modificateurs de qualité : UHD, Full HD resolution, masterpiece, photorealistic, cinematic lighting, sharp focus, professional color grading, HDR
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: base64Image, mimeType: mimeType } },
          { text: prompt }
        ]
      }
    });

    // The model returns the generated image in the response parts
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }

    throw new Error("Aucune image générée par l'IA.");
  } catch (error) {
    console.error("Error generating image:", error);
    throw new Error("La restauration IA a échoué. Veuillez réessayer.");
  }
};
