const STORAGE_KEY = "arquiblog_settings_v1";
const HISTORY_KEY = "arquiblog_history_v1";

const channels = {
  blog: {
    label: "Blog",
    description: "Texto mais profundo, autoral e sensorial para o site do escritório.",
    outputLabel: "Post de blog",
    minWords: 850,
    maxWords: 1000,
    hashtagsHint: "#arquitetura #interiores #design",
    ctaStyle: "Convite sutil para continuar explorando o escritório.",
    emojiPolicy: "Use emojis com muita moderação, apenas se realmente agregarem.",
    guidelines: [
      "Conecte o projeto ao estilo de vida dos moradores.",
      "Misture linguagem emocional, técnica e sensorial.",
      "Use vocabulário acessível, elegante e natural.",
      "Não insira intertítulos.",
      "Não mencione o nome do arquivo da imagem."
    ],
    structure: [
      "Um título criativo no topo, sem rotular como título.",
      "Abertura emocional com contexto e sensações.",
      "Desenvolvimento com descrição técnica de materiais, texturas, layout e soluções.",
      "Encerramento reflexivo com convite suave para interação.",
      "Hashtags relevantes ao final, separadas por espaço."
    ]
  },
  instagram: {
    label: "Instagram",
    description: "Legenda mais curta, envolvente e pensada para performance em redes sociais.",
    outputLabel: "Legenda de Instagram",
    minWords: 90,
    maxWords: 180,
    hashtagsHint: "#arquitetura #design #interiores #decor",
    ctaStyle: "Convite suave para comentar, salvar ou compartilhar.",
    emojiPolicy: "Use poucos emojis, com elegância.",
    guidelines: [
      "Abra com um gancho elegante e fácil de escanear.",
      "Valorize atmosfera, materiais e estilo de vida.",
      "Use quebras de linha estratégicas.",
      "Use emojis de forma pontual e refinada.",
      "Finalize com CTA leve e hashtags relevantes."
    ],
    structure: [
      "Abertura curta e marcante.",
      "Corpo principal com descrição do projeto.",
      "Fechamento com CTA para comentar, salvar ou compartilhar.",
      "Hashtags ao final."
    ]
  },
  linkedin: {
    label: "LinkedIn",
    description: "Texto mais estratégico, profissional e orientado a autoridade de marca.",
    outputLabel: "Post de LinkedIn",
    minWords: 180,
    maxWords: 320,
    hashtagsHint: "#arquitetura #designestrategico #interiores",
    ctaStyle: "Estimule reflexão profissional ou conversa com potenciais clientes.",
    emojiPolicy: "Evite emojis ou use no máximo um.",
    guidelines: [
      "Use um tom consultivo, profissional e claro.",
      "Mostre racional de projeto, decisão e impacto para o cliente.",
      "Equilibre visão estética com critério técnico.",
      "Evite excesso de emojis.",
      "Finalize com provocação ou pergunta profissional."
    ],
    structure: [
      "Abertura com insight sobre o desafio ou oportunidade do projeto.",
      "Desenvolvimento com soluções adotadas e seus efeitos.",
      "Fechamento com aprendizados, posicionamento ou pergunta.",
      "Hashtags discretas ao final."
    ]
  }
};

const defaultSettings = {
  openaiApiKey: "",
  visionModel: "gpt-4o",
  textModel: "gpt-4o-mini",
  officeName: "Vini Escritório de Arquitetura",
  tagline: "Narrativas elegantes para o escritório de arquitetura",
  voiceStyle: "Sofisticada, acolhedora e inspiradora",
  persona: "Redator especialista em arquitetura de interiores",
  objective: "Criar conteúdos envolventes que transformem projetos em narrativas desejáveis",
  defaultChannel: "instagram"
};

const elements = {
  generationForm: document.getElementById("generation-form"),
  settingsForm: document.getElementById("settings-form"),
  channelGrid: document.getElementById("channel-grid"),
  formStatus: document.getElementById("form-status"),
  settingsStatus: document.getElementById("settings-status"),
  imageInput: document.getElementById("image-input"),
  imagePreview: document.getElementById("image-preview"),
  selectedFileName: document.getElementById("selected-file-name"),
  resultMeta: document.getElementById("result-meta"),
  resultImage: document.getElementById("result-image"),
  resultContent: document.getElementById("result-content"),
  historyList: document.getElementById("history-list"),
  keyStatus: document.getElementById("key-status")
};

let settings = loadSettings();
let currentImageUrl = "";

function loadSettings() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return { ...defaultSettings };
  }

  try {
    return { ...defaultSettings, ...JSON.parse(stored) };
  } catch {
    return { ...defaultSettings };
  }
}

function saveSettings() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function loadHistory() {
  const stored = localStorage.getItem(HISTORY_KEY);
  if (!stored) {
    return [];
  }

  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

function saveHistory(items) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 20)));
}

function renderChannels() {
  elements.channelGrid.innerHTML = Object.entries(channels).map(([key, channel]) => `
    <label class="channel-option">
      <input type="radio" name="channel" value="${key}" ${key === settings.defaultChannel ? "checked" : ""}>
      <span class="channel-card">
        <strong>${channel.label}</strong>
        <small>${channel.description}</small>
      </span>
    </label>
  `).join("");

  const select = elements.settingsForm.elements.defaultChannel;
  select.innerHTML = Object.entries(channels).map(([key, channel]) => (
    `<option value="${key}" ${key === settings.defaultChannel ? "selected" : ""}>${channel.label}</option>`
  )).join("");
}

function renderSettings() {
  Object.entries(settings).forEach(([key, value]) => {
    const field = elements.settingsForm.elements[key];
    if (field) {
      field.value = value;
    }
  });

  document.getElementById("brand-tagline").textContent = settings.tagline;
  document.getElementById("office-name").textContent = settings.officeName;
  document.getElementById("voice-style").textContent = settings.voiceStyle;
  document.getElementById("persona-summary").textContent = settings.persona;
  document.getElementById("objective-summary").textContent = settings.objective;
  elements.keyStatus.textContent = settings.openaiApiKey
    ? "API Key configurada neste navegador."
    : "Configure sua OpenAI API Key para gerar conteúdo.";
}

function renderHistory() {
  const history = loadHistory();
  if (!history.length) {
    elements.historyList.innerHTML = "<p class='status-text'>Nenhuma geração encontrada neste navegador.</p>";
    return;
  }

  elements.historyList.innerHTML = "";
  history.forEach((item) => {
    const card = document.createElement("article");
    card.className = "history-card";
    card.innerHTML = `
      <div class="history-topline">
        <strong>${item.channelLabel}</strong>
        <span>${item.createdAt}</span>
      </div>
      <p>${item.phrases.filter(Boolean).join(" - ") || "Sem frases de contexto"}</p>
    `;
    card.addEventListener("click", () => {
      renderResult(item.text, `${item.channelLabel} - ${item.createdAt}`, item.imageUrl);
      activateTab("tab-generate");
    });
    elements.historyList.appendChild(card);
  });
}

function activateTab(targetId) {
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tabTarget === targetId);
  });
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("is-active", panel.id === targetId);
  });
}

function renderResult(text, meta, imageUrl) {
  elements.resultMeta.textContent = meta;
  elements.resultContent.textContent = text;
  elements.resultContent.classList.remove("empty-state");

  if (imageUrl) {
    elements.resultImage.innerHTML = `<img src="${imageUrl}" alt="Imagem do projeto">`;
    elements.resultImage.classList.remove("empty-state");
  } else {
    elements.resultImage.textContent = "Conteúdo gerado sem imagem enviada.";
    elements.resultImage.classList.add("empty-state");
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function callOpenAI(messages, model, maxTokens) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${settings.openaiApiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: maxTokens
    })
  });

  const data = await response.json();
  if (!response.ok) {
    const message = data.error?.message || "Falha na chamada da OpenAI.";
    throw new Error(message);
  }

  return data.choices?.[0]?.message?.content?.trim() || "";
}

async function describeImage(imageDataUrl) {
  return callOpenAI([
    {
      role: "system",
      content: "Você é um arquiteto especialista em design de interiores. Analise a imagem e descreva com detalhes técnicos e sensoriais o estilo, os materiais e a função do ambiente."
    },
    {
      role: "user",
      content: [
        { type: "text", text: "Descreva o ambiente como se fosse publicar no Instagram de um escritório de arquitetura sofisticado." },
        { type: "image_url", image_url: { url: imageDataUrl } }
      ]
    }
  ], settings.visionModel, 700);
}

function buildWritingPrompt(phrases, imageDescription, channelKey) {
  const channel = channels[channelKey];
  const bullets = (items) => items.filter(Boolean).map((item) => `- ${item}`).join("\n");

  return `
Você é um ${settings.persona}, criando conteúdos para o escritório ${settings.officeName}.

Contexto da marca:
- Voz da marca: ${settings.voiceStyle}
- Objetivo principal: ${settings.objective}
- Canal de saída: ${channel.label} (${channel.outputLabel})
- Descrição do canal: ${channel.description}

Diretrizes globais:
- Escreva em português do Brasil.
- Mantenha fluidez e coesão do início ao fim.
- Preserve o posicionamento premium do escritório.
- Nunca mencione o nome da ferramenta ou plataforma usada para gerar o texto.
- Nunca use o nome da ferramenta em hashtags.
- Se houver menção de marca, use apenas o nome do escritório informado.

Diretrizes específicas do canal:
${bullets(channel.guidelines)}

Estrutura esperada:
${bullets(channel.structure)}

Parâmetros finais:
- Texto entre ${channel.minWords} e ${channel.maxWords} palavras
- Nunca ultrapasse o limite máximo de ${channel.maxWords} palavras
- CTA: ${channel.ctaStyle}
- Emojis: ${channel.emojiPolicy}
- Hashtags de referência: ${channel.hashtagsHint}

Descrição automática da imagem:
"${imageDescription}"

Frases fornecidas pelo escritório:
${bullets(phrases)}

Entregue o conteúdo final pronto para publicação, sem explicações extras.
`.trim();
}

async function generateText(phrases, imageDescription, channelKey) {
  return callOpenAI([
    {
      role: "system",
      content: "Você cria conteúdos editoriais premium em português do Brasil para escritórios de arquitetura."
    },
    {
      role: "user",
      content: buildWritingPrompt(phrases, imageDescription, channelKey)
    }
  ], settings.textModel, 1800);
}

function setBusy(isBusy) {
  elements.generationForm.querySelector("button[type='submit']").disabled = isBusy;
}

elements.imageInput.addEventListener("change", () => {
  const [file] = elements.imageInput.files;
  if (!file) {
    currentImageUrl = "";
    elements.imagePreview.innerHTML = "<span>Preview da imagem</span>";
    elements.imagePreview.classList.add("is-empty");
    elements.selectedFileName.textContent = "Clique para escolher o arquivo";
    return;
  }

  currentImageUrl = URL.createObjectURL(file);
  elements.imagePreview.innerHTML = `<img src="${currentImageUrl}" alt="Preview da imagem do projeto">`;
  elements.imagePreview.classList.remove("is-empty");
  elements.selectedFileName.textContent = file.name;
});

elements.generationForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!settings.openaiApiKey.trim()) {
    elements.formStatus.textContent = "Informe a OpenAI API Key na aba Configuração.";
    activateTab("tab-settings");
    return;
  }

  const formData = new FormData(elements.generationForm);
  const phrases = [formData.get("phrase1"), formData.get("phrase2"), formData.get("phrase3")]
    .map((phrase) => String(phrase || "").trim());
  const [file] = elements.imageInput.files;

  if (!file) {
    elements.formStatus.textContent = "Envie uma imagem do projeto.";
    return;
  }

  if (!phrases.some(Boolean)) {
    elements.formStatus.textContent = "Preencha ao menos uma frase para contextualizar o projeto.";
    return;
  }

  const channelKey = formData.get("channel") || settings.defaultChannel;
  const channel = channels[channelKey];

  try {
    setBusy(true);
    elements.formStatus.textContent = "Analisando imagem...";
    const imageDataUrl = await fileToDataUrl(file);
    const imageDescription = await describeImage(imageDataUrl);

    elements.formStatus.textContent = "Gerando conteúdo editorial...";
    const text = await generateText(phrases, imageDescription, channelKey);
    const createdAt = new Date().toLocaleString("pt-BR");

    renderResult(text, `${channel.label} - ${createdAt}`, currentImageUrl);
    saveHistory([
      {
        channelKey,
        channelLabel: channel.label,
        createdAt,
        phrases,
        text,
        imageUrl: currentImageUrl
      },
      ...loadHistory()
    ]);
    renderHistory();
    elements.formStatus.textContent = "Conteúdo gerado com sucesso.";
  } catch (error) {
    elements.formStatus.textContent = error.message;
  } finally {
    setBusy(false);
  }
});

elements.settingsForm.addEventListener("submit", (event) => {
  event.preventDefault();
  settings = { ...settings, ...Object.fromEntries(new FormData(elements.settingsForm).entries()) };
  saveSettings();
  renderChannels();
  renderSettings();
  elements.settingsStatus.textContent = "Configuração salva neste navegador.";
});

document.getElementById("reset-settings").addEventListener("click", () => {
  settings = { ...defaultSettings };
  saveSettings();
  renderChannels();
  renderSettings();
  elements.settingsStatus.textContent = "Configuração padrão restaurada.";
});

document.getElementById("copy-result").addEventListener("click", async () => {
  const text = elements.resultContent.textContent.trim();
  if (!text || elements.resultContent.classList.contains("empty-state")) {
    return;
  }

  await navigator.clipboard.writeText(text);
});

document.getElementById("clear-history").addEventListener("click", () => {
  saveHistory([]);
  renderHistory();
});

document.getElementById("load-example").addEventListener("click", () => {
  renderResult(
    "Selecione uma imagem e configure sua API Key para gerar um texto real com análise visual.",
    "Exemplo local",
    "exemplo_projeto.jpg"
  );
});

document.querySelectorAll(".tab-button").forEach((button) => {
  button.addEventListener("click", () => activateTab(button.dataset.tabTarget));
});

renderChannels();
renderSettings();
renderHistory();
