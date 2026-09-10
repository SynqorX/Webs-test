(function() {
  const MODEL = "gemini-3.6-flash";
  const globalHistory = [];

  function getKey() {
    const key = window.GEMINI_API_KEY;
    if (!key || typeof key !== "string" || !key.trim()) {
      throw new Error("API Key not found. Ensure api.js is loaded and defines window.GEMINI_API_KEY.");
    }
    return key.trim();
  }

  async function askGemini(promptText, customHistory = null) {
    const key = getKey();
    const history = customHistory || globalHistory;

    history.push({ role: "user", parts: [{ text: promptText }] });

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: history,
        // System instruction forces fast, direct answers without conversational fluff
        systemInstruction: {
          parts: [{ text: "Be direct, fast, and concise. Avoid unnecessary conversational filler." }]
        },
        generationConfig: {
          thinkingConfig: {
            // "minimal" reduces reasoning to the lowest possible threshold
            thinkingLevel: "minimal"
          }
        }
      })
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      history.pop();
      throw new Error(data.error?.message || `HTTP ${res.status}`);
    }

    const parts = data.candidates?.[0]?.content?.parts || [];
    const reply = parts
      .filter(p => typeof p.text === "string")
      .map(p => p.text)
      .join("")
      .trim();

    if (!reply) {
      history.pop();
      throw new Error("Received empty response from the model.");
    }

    history.push({ role: "model", parts: [{ text: reply }] });
    return reply;
  }

  window.GeminiClient = {
    ask: askGemini,
    history: globalHistory,
    clearHistory: () => { globalHistory.length = 0; }
  };
})();
