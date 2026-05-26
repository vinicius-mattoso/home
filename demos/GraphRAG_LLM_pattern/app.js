const STORAGE_KEYS = {
  apiKey: "graphragPattern.openaiApiKey",
  model: "graphragPattern.model",
  baseUrl: "graphragPattern.baseUrl",
  graph: "graphragPattern.graph",
};

const DEFAULT_ONTOLOGY = `node_types:
  - name: Person
    description: A human individual mentioned in the source material.
  - name: Location
    description: A geographic place such as a city, country, or region.
  - name: Organization
    description: An institution, company, academy, party, or government body.
  - name: Year
    description: A calendar year explicitly mentioned in the source material.
  - name: Artifact
    description: A named theory, equation, letter, project, paper, or work product.
  - name: Award
    description: A named prize, honor, or formal award.

relationship_types:
  - name: born_in
    source: Person
    target: Location
    description: The person's birthplace.
  - name: born_in_year
    source: Person
    target: Year
    description: The year when the person was born.
  - name: studied_at
    source: Person
    target: Organization
    description: A person studied at an educational institution.
  - name: worked_at
    source: Person
    target:
      - Organization
      - Location
    description: A person worked at or was professionally associated with an institution or place.
  - name: worked_on
    source: Person
    target: Artifact
    description: A person worked on a named artifact.
  - name: received
    source: Person
    target: Award
    description: A person received a named award.`;

const DEFAULT_TEXT = `Albert Einstein was a German-born theoretical physicist, widely regarded as one
of the most influential scientists of the twentieth century. He was born on
14 March 1879 in Ulm, in the Kingdom of Wurttemberg in the German Empire.

In 1896, Einstein enrolled at the Swiss Federal Polytechnic in Zurich, where he
studied to become a teacher of mathematics and physics. After graduating,
Einstein worked at the Swiss Patent Office in Bern.

Einstein developed the general theory of relativity, published in 1915. He
received the Nobel Prize in Physics in 1921, primarily for his explanation of
the photoelectric effect. In 1933, he settled in the United States and joined
the Institute for Advanced Study in Princeton, New Jersey.`;

let currentOntology = null;
let currentGraph = loadStoredGraph();

const $ = (id) => document.getElementById(id);

function initialize() {
  $("ontologyInput").value = DEFAULT_ONTOLOGY;
  $("sourceTextInput").value = DEFAULT_TEXT;
  $("apiKeyInput").value = localStorage.getItem(STORAGE_KEYS.apiKey) || "";
  $("modelInput").value = localStorage.getItem(STORAGE_KEYS.model) || "gpt-5.4-nano";
  $("baseUrlInput").value = localStorage.getItem(STORAGE_KEYS.baseUrl) || "https://api.openai.com/v1";

  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => activateTab(button.dataset.tab));
  });

  $("saveConfigButton").addEventListener("click", saveConfig);
  $("clearConfigButton").addEventListener("click", clearConfig);
  $("renderOntologyButton").addEventListener("click", renderOntology);
  $("runIngestionButton").addEventListener("click", runIngestion);
  $("runQueryButton").addEventListener("click", runQuery);

  updateConfigStatus();
  renderOntology();
  if (currentGraph) {
    renderKnowledgeGraph(currentGraph);
  }
}

function activateTab(tabId) {
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabId);
  });
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === tabId);
  });
}

function saveConfig() {
  localStorage.setItem(STORAGE_KEYS.apiKey, $("apiKeyInput").value.trim());
  localStorage.setItem(STORAGE_KEYS.model, $("modelInput").value.trim());
  localStorage.setItem(STORAGE_KEYS.baseUrl, normalizeBaseUrl($("baseUrlInput").value.trim()));
  $("baseUrlInput").value = localStorage.getItem(STORAGE_KEYS.baseUrl);
  updateConfigStatus();
  showToast("Config saved in this browser.");
}

function clearConfig() {
  localStorage.removeItem(STORAGE_KEYS.apiKey);
  localStorage.removeItem(STORAGE_KEYS.model);
  localStorage.removeItem(STORAGE_KEYS.baseUrl);
  $("apiKeyInput").value = "";
  $("modelInput").value = "gpt-5.4-nano";
  $("baseUrlInput").value = "https://api.openai.com/v1";
  updateConfigStatus();
  showToast("Saved config cleared.");
}

function getConfig() {
  return {
    apiKey: $("apiKeyInput").value.trim(),
    model: $("modelInput").value.trim() || "gpt-5.4-nano",
    baseUrl: normalizeBaseUrl($("baseUrlInput").value.trim() || "https://api.openai.com/v1"),
  };
}

function updateConfigStatus() {
  const hasKey = Boolean($("apiKeyInput").value.trim());
  $("configStatus").textContent = hasKey ? "Config ready" : "Config not set";
  $("configStatus").classList.toggle("ready", hasKey);
}

function normalizeBaseUrl(value) {
  return value.replace(/\/+$/, "");
}

function parseOntology() {
  const parsed = jsyaml.load($("ontologyInput").value);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Ontology must be a YAML object.");
  }
  const nodeTypes = Array.isArray(parsed.node_types) ? parsed.node_types : [];
  const relationshipTypes = Array.isArray(parsed.relationship_types) ? parsed.relationship_types : [];
  if (nodeTypes.length === 0) {
    throw new Error("Ontology must define at least one node type.");
  }
  const labels = new Set(nodeTypes.map((node) => node.name));
  relationshipTypes.forEach((relationship) => {
    endpointList(relationship.source).forEach((source) => {
      if (!labels.has(source)) throw new Error(`Unknown relationship source: ${source}`);
    });
    endpointList(relationship.target).forEach((target) => {
      if (!labels.has(target)) throw new Error(`Unknown relationship target: ${target}`);
    });
  });
  return {
    node_types: nodeTypes,
    relationship_types: relationshipTypes,
  };
}

function endpointList(value) {
  return Array.isArray(value) ? value : [value];
}

function renderOntology() {
  try {
    currentOntology = parseOntology();
    $("ontologyGraph").innerHTML = renderGraphSvg({
      nodes: currentOntology.node_types.map((node) => ({
        id: node.name,
        label: node.name,
        type: "type",
      })),
      edges: currentOntology.relationship_types.flatMap((relationship) =>
        endpointList(relationship.source).flatMap((source) =>
          endpointList(relationship.target).map((target) => ({
            source,
            target,
            label: relationship.name,
          })),
        ),
      ),
    });
    $("ontologySummary").textContent =
      `${currentOntology.node_types.length} node types, ` +
      `${currentOntology.relationship_types.length} relationship types`;
  } catch (error) {
    showToast(error.message, true);
  }
}

function buildExtractionSchema(ontology) {
  return {
    type: "object",
    additionalProperties: false,
    required: ["document_id", "nodes", "relationships"],
    properties: {
      document_id: { type: "string" },
      nodes: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "label", "name", "evidence"],
          properties: {
            id: { type: "string" },
            label: { type: "string", enum: ontology.node_types.map((node) => node.name).sort() },
            name: { type: "string" },
            evidence: { type: "string" },
          },
        },
      },
      relationships: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["source", "target", "type", "evidence"],
          properties: {
            source: { type: "string" },
            target: { type: "string" },
            type: {
              type: "string",
              enum: ontology.relationship_types.map((relationship) => relationship.name).sort(),
            },
            evidence: { type: "string" },
          },
        },
      },
    },
  };
}

function ontologyPrompt(ontology) {
  const nodeLines = ontology.node_types.map((node) => {
    const description = node.description ? ` - ${node.description}` : "";
    return `- ${node.name}${description}`;
  });
  const relationshipLines = ontology.relationship_types.map((relationship) => {
    const description = relationship.description ? ` - ${relationship.description}` : "";
    return `- ${relationship.name}: ${endpointList(relationship.source).join(" | ")} -> ${endpointList(relationship.target).join(" | ")}${description}`;
  });
  return `Allowed node types:\n${nodeLines.join("\n")}\n\nAllowed relationship types:\n${relationshipLines.join("\n")}`;
}

async function runIngestion() {
  const config = getConfig();
  if (!config.apiKey) {
    activateTab("config");
    showToast("Add an OpenAI API key in Config first.", true);
    return;
  }

  let ontology;
  try {
    ontology = parseOntology();
  } catch (error) {
    showToast(error.message, true);
    return;
  }

  const sourceText = $("sourceTextInput").value.trim();
  if (!sourceText) {
    showToast("Add source text before running extraction.", true);
    return;
  }

  setBusy("runIngestionButton", true, "Extracting...");
  try {
    const responseJson = await callResponsesApi(config, {
      input: [
        {
          role: "system",
          content: [
            "You extract graph nodes and relationships from text.",
            "Use only the ontology supplied by the user.",
            "Do not create node labels outside the ontology.",
            "Do not create relationship types outside the ontology.",
            "A relationship source and target must refer to extracted node ids.",
            "A relationship source and target must match the ontology endpoint types.",
            "If a relationship endpoint is ambiguous, omit that relationship instead of guessing.",
            "If the text has no supported facts, return empty arrays.",
          ].join(" "),
        },
        {
          role: "user",
          content: `Document id: browser_source\n\nOntology:\n${ontologyPrompt(ontology)}\n\nText:\n${sourceText}`,
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "graph_extraction",
          strict: true,
          schema: buildExtractionSchema(ontology),
        },
      },
    });
    currentOntology = ontology;
    currentGraph = validateAndCleanGraph(extractOutputJson(responseJson), ontology);
    localStorage.setItem(STORAGE_KEYS.graph, JSON.stringify(currentGraph));
    renderKnowledgeGraph(currentGraph);
    showToast(`Extracted ${currentGraph.nodes.length} nodes and ${currentGraph.relationships.length} relationships.`);
  } catch (error) {
    showToast(error.message, true);
  } finally {
    setBusy("runIngestionButton", false, "Run extraction");
  }
}

function validateAndCleanGraph(graph, ontology) {
  const labels = new Set(ontology.node_types.map((node) => node.name));
  const relationshipTypes = new Map(ontology.relationship_types.map((relationship) => [relationship.name, relationship]));
  const nodes = (graph.nodes || [])
    .filter((node) => node.id && node.name && labels.has(node.label))
    .map((node) => ({ properties: {}, ...node }));
  const nodesById = new Map(nodes.map((node) => [node.id, node]));

  const relationships = (graph.relationships || [])
    .filter((relationship) => {
      const definition = relationshipTypes.get(relationship.type);
      if (!definition || !nodesById.has(relationship.source) || !nodesById.has(relationship.target)) return false;
      const sourceLabel = nodesById.get(relationship.source).label;
      const targetLabel = nodesById.get(relationship.target).label;
      return endpointList(definition.source).includes(sourceLabel) && endpointList(definition.target).includes(targetLabel);
    })
    .map((relationship) => ({ properties: {}, ...relationship }));

  return {
    document_id: graph.document_id || "browser_source",
    nodes,
    relationships,
  };
}

function renderKnowledgeGraph(graph) {
  $("knowledgeGraph").innerHTML = renderGraphSvg({
    nodes: graph.nodes.map((node) => ({
      id: node.id,
      label: `${node.name}\n${node.label}`,
      type: node.label,
    })),
    edges: graph.relationships.map((relationship) => ({
      source: relationship.source,
      target: relationship.target,
      label: relationship.type,
    })),
  });
  $("graphSummary").textContent = `${graph.nodes.length} nodes, ${graph.relationships.length} relationships`;
  $("nodesTable").innerHTML = renderTable(["id", "label", "name", "evidence"], graph.nodes);
  $("relationshipsTable").innerHTML = renderTable(
    ["index", "source", "type", "target", "evidence"],
    graph.relationships.map((relationship, index) => ({ index, ...relationship })),
  );
}

async function runQuery() {
  const config = getConfig();
  if (!config.apiKey) {
    activateTab("config");
    showToast("Add an OpenAI API key in Config first.", true);
    return;
  }
  if (!currentGraph) {
    activateTab("ingestion");
    showToast("Run ingestion before querying.", true);
    return;
  }
  const question = $("questionInput").value.trim();
  if (!question) {
    showToast("Add a question first.", true);
    return;
  }

  setBusy("runQueryButton", true, "Asking...");
  try {
    const responseJson = await callResponsesApi(config, {
      input: [
        {
          role: "system",
          content:
            "Answer using only the supplied knowledge graph. If the graph does not contain enough information, say so. Return the node ids and relationship indexes used.",
        },
        {
          role: "user",
          content: `Question: ${question}\n\nKnowledge graph:\n${graphContext(currentGraph)}`,
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "knowledge_graph_answer",
          strict: true,
          schema: answerSchema(),
        },
      },
    });

    const answer = extractOutputJson(responseJson);
    renderAnswer(answer);
  } catch (error) {
    showToast(error.message, true);
  } finally {
    setBusy("runQueryButton", false, "Ask");
  }
}

function answerSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["answer", "used_node_ids", "used_relationship_indexes"],
    properties: {
      answer: { type: "string" },
      used_node_ids: { type: "array", items: { type: "string" } },
      used_relationship_indexes: { type: "array", items: { type: "integer" } },
    },
  };
}

function graphContext(graph) {
  const nodes = graph.nodes
    .map((node) => `- ${node.id}: label=${node.label}; name=${node.name}; evidence=${node.evidence}`)
    .join("\n");
  const relationships = graph.relationships
    .map(
      (relationship, index) =>
        `- [${index}] ${relationship.source} -${relationship.type}-> ${relationship.target}; evidence=${relationship.evidence}`,
    )
    .join("\n");
  return `Document id: ${graph.document_id}\n\nNodes:\n${nodes}\n\nRelationships:\n${relationships}`;
}

function renderAnswer(answer) {
  $("answerBox").textContent = answer.answer || "No answer returned.";
  const usedRelationshipIndexes = new Set(answer.used_relationship_indexes || []);
  const usedNodeIds = new Set(answer.used_node_ids || []);
  currentGraph.relationships.forEach((relationship, index) => {
    if (usedRelationshipIndexes.has(index)) {
      usedNodeIds.add(relationship.source);
      usedNodeIds.add(relationship.target);
    }
  });

  const usedNodes = currentGraph.nodes.filter((node) => usedNodeIds.has(node.id));
  const usedRelationships = currentGraph.relationships
    .map((relationship, index) => ({ index, ...relationship }))
    .filter((relationship) => usedRelationshipIndexes.has(relationship.index));

  $("usedNodesTable").innerHTML = renderTable(["id", "label", "name", "evidence"], usedNodes);
  $("usedRelationshipsTable").innerHTML = renderTable(
    ["index", "source", "type", "target", "evidence"],
    usedRelationships,
  );
  $("evidenceSummary").textContent = `${usedNodes.length} nodes, ${usedRelationships.length} relationships`;
  $("subgraph").innerHTML = renderGraphSvg({
    nodes: usedNodes.map((node) => ({ id: node.id, label: `${node.name}\n${node.label}` })),
    edges: usedRelationships.map((relationship) => ({
      source: relationship.source,
      target: relationship.target,
      label: relationship.type,
    })),
  });
}

async function callResponsesApi(config, body) {
  const response = await fetch(`${config.baseUrl}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      ...body,
    }),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = json?.error?.message || `OpenAI request failed with status ${response.status}`;
    throw new Error(message);
  }
  return json;
}

function extractOutputJson(responseJson) {
  if (responseJson.output_text) {
    return JSON.parse(responseJson.output_text);
  }
  const textBlocks = [];
  (responseJson.output || []).forEach((item) => {
    (item.content || []).forEach((content) => {
      if (content.text) textBlocks.push(content.text);
    });
  });
  if (textBlocks.length === 0) {
    throw new Error("OpenAI response did not contain output text.");
  }
  return JSON.parse(textBlocks.join(""));
}

function renderTable(columns, rows) {
  if (!rows || rows.length === 0) {
    return `<p class="muted">No rows.</p>`;
  }
  const header = columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("");
  const body = rows
    .map(
      (row) =>
        `<tr>${columns
          .map((column) => `<td>${escapeHtml(String(row[column] ?? ""))}</td>`)
          .join("")}</tr>`,
    )
    .join("");
  return `<table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
}

function renderGraphSvg({ nodes, edges }) {
  if (!nodes.length) {
    return `<p class="muted" style="padding: 16px;">No graph to render.</p>`;
  }
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const levels = assignLevels(nodes, edges);
  const grouped = groupByLevel(nodes, levels);
  const positions = new Map();
  const xGap = 260;
  const yGap = 112;
  let maxRows = 1;

  grouped.forEach((levelNodes, level) => {
    maxRows = Math.max(maxRows, levelNodes.length);
    levelNodes.forEach((node, row) => {
      positions.set(node.id, {
        x: 90 + level * xGap,
        y: 70 + row * yGap,
      });
    });
  });

  const width = Math.max(760, 220 + grouped.size * xGap);
  const height = Math.max(260, 150 + maxRows * yGap);
  const edgeSvg = edges
    .filter((edge) => positions.has(edge.source) && positions.has(edge.target))
    .map((edge) => {
      const source = positions.get(edge.source);
      const target = positions.get(edge.target);
      const startX = source.x + 86;
      const endX = target.x - 86;
      const midX = (startX + endX) / 2;
      const path = `M ${startX} ${source.y} C ${midX} ${source.y}, ${midX} ${target.y}, ${endX} ${target.y}`;
      return `<path d="${path}" fill="none" stroke="#334155" stroke-width="1.6" marker-end="url(#arrow)" />
        <text x="${midX}" y="${(source.y + target.y) / 2 - 8}" text-anchor="middle" class="edge-label">${escapeHtml(edge.label)}</text>`;
    })
    .join("");

  const nodeSvg = nodes
    .map((node) => {
      const position = positions.get(node.id);
      const labelLines = String(node.label || node.id).split("\n");
      const lineSvg = labelLines
        .slice(0, 2)
        .map((line, index) => `<tspan x="${position.x}" dy="${index === 0 ? -4 : 17}">${escapeHtml(line)}</tspan>`)
        .join("");
      return `<g>
        <rect x="${position.x - 86}" y="${position.y - 30}" width="172" height="60" rx="8" fill="#ecfdf5" stroke="#0f766e" />
        <text x="${position.x}" y="${position.y}" text-anchor="middle" class="node-label">${lineSvg}</text>
      </g>`;
    })
    .join("");

  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Graph visualization">
    <defs>
      <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#334155"></path>
      </marker>
    </defs>
    <style>
      .node-label { font: 12px system-ui, sans-serif; fill: #18202f; }
      .edge-label { font: 11px system-ui, sans-serif; fill: #475569; paint-order: stroke; stroke: #fbfcfe; stroke-width: 5px; }
    </style>
    ${edgeSvg}
    ${nodeSvg}
  </svg>`;
}

function assignLevels(nodes, edges) {
  const levels = new Map(nodes.map((node) => [node.id, 0]));
  for (let pass = 0; pass < nodes.length; pass += 1) {
    let changed = false;
    edges.forEach((edge) => {
      if (!levels.has(edge.source) || !levels.has(edge.target)) return;
      const candidate = Math.min(levels.get(edge.source) + 1, 4);
      if (candidate > levels.get(edge.target)) {
        levels.set(edge.target, candidate);
        changed = true;
      }
    });
    if (!changed) break;
  }
  return levels;
}

function groupByLevel(nodes, levels) {
  const grouped = new Map();
  nodes.forEach((node) => {
    const level = levels.get(node.id) || 0;
    if (!grouped.has(level)) grouped.set(level, []);
    grouped.get(level).push(node);
  });
  return new Map([...grouped.entries()].sort((a, b) => a[0] - b[0]));
}

function setBusy(buttonId, isBusy, text) {
  const button = $(buttonId);
  button.disabled = isBusy;
  button.textContent = text;
}

function showToast(message, isError = false) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.toggle("error", isError);
  toast.classList.add("visible");
  window.setTimeout(() => toast.classList.remove("visible"), 4200);
}

function loadStoredGraph() {
  const raw = localStorage.getItem(STORAGE_KEYS.graph);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

document.addEventListener("DOMContentLoaded", initialize);
