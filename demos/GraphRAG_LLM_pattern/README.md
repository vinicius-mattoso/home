# GraphRAG LLM Pattern

Static GitHub Pages version of the GraphRAG extraction/query demo.

## Files

- `index.html`: app shell with Config, Ingestion, and Query tabs.
- `styles.css`: responsive app styling.
- `app.js`: browser-only extraction, query, validation, and graph rendering.

## GitHub Pages Usage

Publish this folder as a static site. No Python server, `.env`, or backend is required.

The user must open the Config tab and provide:

- OpenAI API key
- model name
- API base URL, defaulting to `https://api.openai.com/v1`

The key can be saved in `localStorage` for that browser, but this is only suitable for demos. For production, use a server-side proxy so secrets are not exposed to the browser.

## Local Preview

Because this is static HTML, either open `index.html` directly or serve it with:

```powershell
python -m http.server 8080 -d GraphRAG_LLM_pattern
```

Then open `http://localhost:8080`.
