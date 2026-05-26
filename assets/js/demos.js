const DEFAULT_LANG = "pt-BR";
let currentLang = localStorage.getItem("site-lang") || DEFAULT_LANG;

function resolveAppUrl(path) {
  return new URL(path, document.baseURI).toString();
}

function resolveMaybeExternalUrl(path) {
  if (!path) return "";
  if (/^(https?:|mailto:|tel:)/i.test(path)) {
    return path;
  }
  return resolveAppUrl(path);
}

async function loadTranslations(lang) {
  const response = await fetch(resolveAppUrl(`../assets/data/demos-${lang}.json`));
  if (!response.ok) {
    throw new Error(`Failed to load demo translations for ${lang}`);
  }
  return response.json();
}

function getNestedValue(obj, path) {
  return path.split(".").reduce((acc, part) => acc && acc[part], obj);
}

function setTextContent(data) {
  document.documentElement.lang = currentLang;

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.getAttribute("data-i18n");
    const value = getNestedValue(data, key);
    if (value) {
      element.textContent = value;
    }
  });

  document.title = data.meta.title;

  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) {
    metaDescription.setAttribute("content", data.meta.description);
  }

  renderDemos(data.demos.items || [], data.demos.openLabel || "Abrir demo");
  updateActiveLanguageButton();
}

function renderDemos(items, openLabel) {
  const grid = document.getElementById("demos-grid");
  if (!grid) return;

  grid.innerHTML = "";

  items.forEach((demo, index) => {
    const card = document.createElement("article");
    card.className = "project-card demo-card";

    const tags = (demo.tags || [])
      .map((tag) => `<span class="project-tag">${tag}</span>`)
      .join("");

    const demoUrl = resolveMaybeExternalUrl(demo.demoUrl);
    const repoUrl = resolveMaybeExternalUrl(demo.repoUrl);

    card.innerHTML = `
      <div class="project-card-top">
        <span class="project-index">${String(index + 1).padStart(2, "0")}</span>
        <p class="project-highlight">${demo.highlight || ""}</p>
      </div>
      <h4>${demo.title}</h4>
      <p>${demo.description}</p>
      <div class="project-tags">${tags}</div>
      <div class="project-links">
        <a href="${demoUrl}" rel="noopener">${openLabel}</a>
        ${repoUrl ? `<a href="${repoUrl}" target="_blank" rel="noopener">GitHub</a>` : ""}
      </div>
    `;

    grid.appendChild(card);
  });
}

function updateActiveLanguageButton() {
  document.querySelectorAll(".lang-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.lang === currentLang);
  });
}

async function applyLanguage(lang) {
  currentLang = lang;
  localStorage.setItem("site-lang", lang);
  const data = await loadTranslations(lang);
  setTextContent(data);
}

function bindLanguageSwitcher() {
  document.querySelectorAll(".lang-btn").forEach((button) => {
    button.addEventListener("click", () => {
      applyLanguage(button.dataset.lang);
    });
  });
}

function setCurrentYear() {
  const year = document.getElementById("current-year");
  if (year) {
    year.textContent = new Date().getFullYear();
  }
}

async function init() {
  bindLanguageSwitcher();
  setCurrentYear();

  try {
    await applyLanguage(currentLang);
  } catch (error) {
    console.error(error);
    if (currentLang !== DEFAULT_LANG) {
      await applyLanguage(DEFAULT_LANG);
    }
  }
}

init();
