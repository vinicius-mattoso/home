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
  const response = await fetch(resolveAppUrl(`assets/data/${lang}.json`));
  if (!response.ok) {
    throw new Error(`Failed to load translations for ${lang}`);
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

  const resumeLink = document.getElementById("resume-link");
  if (resumeLink) {
    if (data.hero.resumeLink && data.hero.resumeLink.trim() !== "") {
      resumeLink.setAttribute("href", resolveMaybeExternalUrl(data.hero.resumeLink));
      resumeLink.classList.remove("btn-disabled");
      resumeLink.removeAttribute("aria-disabled");
    } else {
      resumeLink.setAttribute("href", "javascript:void(0)");
      resumeLink.classList.add("btn-disabled");
      resumeLink.setAttribute("aria-disabled", "true");
    }
  }

  renderHeroMetrics(data.hero.metrics || []);
  renderHeroFocus(data.hero.focusItems || []);
  renderAboutPoints(data.about.points || []);
  renderProjects(data.projects.items || []);
  renderFocus(data.focus.items || []);
  renderExperience(data.experience.items || []);
  updateActiveLanguageButton();
}

function renderHeroMetrics(items) {
  const container = document.getElementById("hero-metrics");
  if (!container) return;

  container.innerHTML = "";

  items.forEach((item) => {
    const article = document.createElement("article");
    article.className = "metric-card";
    article.innerHTML = `
      <strong>${item.value}</strong>
      <span>${item.label}</span>
    `;
    container.appendChild(article);
  });
}

function renderHeroFocus(items) {
  const list = document.getElementById("hero-focus-list");
  if (!list) return;

  list.innerHTML = "";

  items.forEach((item) => {
    const article = document.createElement("article");
    article.className = "signal-item";
    article.innerHTML = `<p>${item}</p>`;
    list.appendChild(article);
  });
}

function renderAboutPoints(items) {
  const list = document.getElementById("about-points");
  if (!list) return;

  list.innerHTML = "";

  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    list.appendChild(li);
  });
}

function renderProjects(items) {
  const grid = document.getElementById("projects-grid");
  if (!grid) return;

  grid.innerHTML = "";

  items.forEach((project, index) => {
    const card = document.createElement("article");
    card.className = "project-card";

    const tags = (project.tags || [])
      .map((tag) => `<span class="project-tag">${tag}</span>`)
      .join("");

    const repoUrl = resolveMaybeExternalUrl(project.repoUrl);
    const demoUrl = resolveMaybeExternalUrl(project.demoUrl);

    card.innerHTML = `
      <div class="project-card-top">
        <span class="project-index">${String(index + 1).padStart(2, "0")}</span>
        <p class="project-highlight">${project.highlight || ""}</p>
      </div>
      <h4>${project.title}</h4>
      <p>${project.description}</p>
      <div class="project-tags">${tags}</div>
      <div class="project-links">
        <a href="${repoUrl}" target="_blank" rel="noopener">GitHub</a>
        ${demoUrl ? `<a href="${demoUrl}" target="_blank" rel="noopener">Demo</a>` : ""}
      </div>
    `;

    grid.appendChild(card);
  });
}

function renderFocus(items) {
  const grid = document.getElementById("focus-grid");
  if (!grid) return;

  grid.innerHTML = "";

  items.forEach((item) => {
    const chip = document.createElement("span");
    chip.className = "focus-chip";
    chip.textContent = item;
    grid.appendChild(chip);
  });
}

function renderExperience(items) {
  const list = document.getElementById("experience-list");
  if (!list) return;

  list.innerHTML = "";

  items.forEach((item) => {
    const block = document.createElement("article");
    block.className = "timeline-item";
    block.innerHTML = `
      <div class="timeline-meta">${item.period}</div>
      <h4>${item.role}</h4>
      <p>${item.description}</p>
    `;
    list.appendChild(block);
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
