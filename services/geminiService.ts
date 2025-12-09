import { GoogleGenAI } from "@google/genai";
import { Reservation, Area } from '../types';

let genAI: GoogleGenAI | null = null;

try {
  if (process.env.API_KEY) {
    genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
} catch (e) {
  console.error("Failed to initialize GoogleGenAI", e);
}

export const getGeminiChatResponse = async (
  message: string,
  contextData: { reservations: Reservation[], areas: Area[], currentUserRole: string }
): Promise<string> => {
  if (!genAI) {
    return "O serviço de IA está indisponível no momento. Por favor, verifique a configuração da chave de API.";
  }

  const systemInstruction = `
    Você é o 'CondoBot', o assistente inteligente do sistema de gestão Condominium+.
    
    Perfil do Usuário Atual: ${contextData.currentUserRole === 'MANAGER' ? 'SÍNDICO (MANAGER)' : 'MORADOR (RESIDENT)'}
    
    Áreas Comuns Disponíveis: ${contextData.areas.map(a => a.name).join(', ')}.
    
    Seu objetivo é ajudar os usuários com base em seus cargos:
    - Para MORADORES: Explique regras de convivência, verifique disponibilidade geral (sem citar nomes de outros vizinhos) e dê sugestões para eventos.
    - Para SÍNDICOS: Analise tendências de uso, ajude a redigir comunicados ou resuma o status atual das reservas.
    
    Contexto Atual:
    Existem ${contextData.reservations.length} reservas registradas no sistema.
    
    Diretrizes:
    1. Responda sempre em Português do Brasil.
    2. Seja cortês, profissional e prestativo.
    3. Mantenha as respostas concisas.
  `;

  try {
    const model = genAI.models;
    const response = await model.generateContent({
      model: "gemini-2.5-flash",
      contents: message,
      config: {
        systemInstruction: systemInstruction,
      }
    });

    return response.text || "Não consegui gerar uma resposta neste momento. Tente novamente.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Estou com problemas para me conectar ao servidor inteligente agora. Tente novamente mais tarde.";
  }
};