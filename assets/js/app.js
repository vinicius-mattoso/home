const DEFAULT_LANG = "pt-BR";
let currentLang = localStorage.getItem("site-lang") || DEFAULT_LANG;

async function loadTranslations(lang) {
  const response = await fetch(`assets/data/${lang}.json`);
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
      resumeLink.setAttribute("href", data.hero.resumeLink);
      resumeLink.classList.remove("btn-disabled");
      resumeLink.removeAttribute("aria-disabled");
    } else {
      resumeLink.setAttribute("href", "javascript:void(0)");
      resumeLink.classList.add("btn-disabled");
      resumeLink.setAttribute("aria-disabled", "true");
    }
  }

  renderHeroFocus(data.hero.focusItems);
  renderProjects(data.projects.items);
  renderFocus(data.focus.items);
  renderExperience(data.experience.items);
  updateActiveLanguageButton();
}

function renderHeroFocus(items) {
  const list = document.getElementById("hero-focus-list");
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

  items.forEach((project) => {
    const card = document.createElement("article");
    card.className = "project-card";

    const tags = (project.tags || [])
      .map((tag) => `<span class="project-tag">${tag}</span>`)
      .join("");

    card.innerHTML = `
      <h4>${project.title}</h4>
      <p>${project.description}</p>
      <div class="project-tags">${tags}</div>
      <div class="project-links">
        <a href="${project.repoUrl}" target="_blank" rel="noopener">GitHub</a>
        ${project.demoUrl ? `<a href="${project.demoUrl}" target="_blank" rel="noopener">Demo</a>` : ""}
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