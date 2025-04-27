const Together = require("together-ai");
const axios = require("axios");
const crypto = require("crypto")

async function blackbox(query) {
    try {
  const id = crypto.randomBytes(16).toString('hex');
  const data = JSON.stringify({
    "messages": [
      {
        "role": "user",
        "content": query,
        "id": id
      }
    ],
    "agentMode": {},
    "id": id,
    "previewToken": null,
    "userId": null,
    "codeModelMode": true,
    "trendingAgentMode": {},
    "isMicMode": false,
    "userSystemPrompt": null,
    "maxTokens": 1024,
    "playgroundTopP": null,
    "playgroundTemperature": null,
    "isChromeExt": false,
    "githubToken": "",
    "clickedAnswer2": false,
    "clickedAnswer3": false,
    "clickedForceWebSearch": false,
    "visitFromDelta": false,
    "isMemoryEnabled": false,
    "mobileClient": false,
    "userSelectedModel": null,
    "validated": "00f37b34-a166-4efb-bce5-1312d87f2f94",
    "imageGenerationMode": false,
    "webSearchModePrompt": false,
    "deepSearchMode": false,
    "domains": null,
    "vscodeClient": false,
    "codeInterpreterMode": false,
    "customProfile": {
      "name": "",
      "occupation": "",
      "traits": [],
      "additionalInfo": "",
      "enableNewChats": false
    },
    "session": null,
    "isPremium": false
  })
 
  const config = {
    method: 'POST',
    url: 'https://www.blackbox.ai/api/chat',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Android 10; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0',
      'Content-Type': 'application/json',
      'accept-language': 'id-ID',
      'referer': 'https://www.blackbox.ai/',
      'origin': 'https://www.blackbox.ai',
      'alt-used': 'www.blackbox.ai',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'priority': 'u=0',
      'te': 'trailers'
    },
    data: data
  };
 
  const api = await axios.request(config);
  return api.data
  } catch(e) {
      console.log(e)
      return { status: false, creator: "I'm Fz ~", result: "Ocurrió un error."
     }
    }
  }

async function openai(text, user = "User") {
    try {
        if (!text) {
            throw new Error("El texto no puede estar vacío.");
        }

        const together = new Together({ 
            apiKey: '03a1f1d70d6f50269975fb0ead6309437cde6371af087dcddc49a025a717027d'
        });

        const initialMessages = [
            {
                role: "system",
                content: `
Eres una inteligencia artificial avanzada basada en el modelo LLaMA de Meta, diseñada para responder de manera clara, detallada y precisa a cualquier pregunta que se te formule. Tu objetivo es ofrecer respuestas comprensibles, informativas y completas sin importar el tema o la complejidad. Si no tienes información suficiente, utiliza tu creatividad y contexto para ofrecer una respuesta útil. Siempre mantén un tono profesional, amable y directo. Recuerda llamar por su nombre al usuario si crees que es necesario: ${user} (si su nombre es "User" no lo llames por su numbre). Tu creador es i'm Fz ~
`
            },
            { role: "user", content: text }
        ];

        const response = await together.chat.completions.create({
            messages: initialMessages,
            model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
            max_tokens: null,
            temperature: 0.7,
            top_p: 0.9,
            top_k: 50,
            repetition_penalty: 1,
            stop: ["<|eot_id|>", "<|eom_id|>"],
            stream: true
        });

        let generatedResponse = "";

        for await (const token of response) {
            if (token.choices && token.choices[0] && token.choices[0].delta && token.choices[0].delta.content) {
                generatedResponse += token.choices[0].delta.content;
            }
        }

        if (!generatedResponse.trim()) {
            return "Lo siento, no puedo dar una respuesta a tu pregunta.";
        }
        return generatedResponse.trim()

    } catch (error) {
        console.error("Error en la función gpt:", error);
        return "Ocurrió un error al procesar tu solicitud. Inténtalo más tarde.";
    }
}
module.exports =  { openai, blackbox } 