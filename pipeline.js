const STORAGE_KEY = "smokeshop-growth-leads";
const GUARDIAN_LOG_KEY = "smokeshop-growth-guardian-log";

const sampleLeads = [
  {
    id: crypto.randomUUID(),
    name: "Cloud 9 Smoke & Vape",
    contact: "Mike",
    phone: "(214) 555-0110",
    city: "Dallas, TX",
    demoUrl: "",
    status: "ready-to-call",
    notes: "Strong Google Maps reviews. Could pitch online menu and curbside pickup.",
    createdAt: new Date().toISOString(),
    history: ["Demo concept is still needed before the first call."]
  },
  {
    id: crypto.randomUUID(),
    name: "Velvet Leaf Smoke Shop",
    contact: "Sara",
    phone: "(469) 555-0199",
    city: "Plano, TX",
    demoUrl: "",
    status: "callback",
    notes: "Manager asked for a callback after 3 PM tomorrow.",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    history: ["Reached manager. Wants callback after inventory day wraps up."]
  }
];

const statusLabels = {
  new: "New",
  "ready-to-call": "Ready to Call",
  interested: "Interested",
  callback: "Callback",
  "not-interested": "Not Interested"
};

const heroStats = document.querySelector("#hero-stats");
const leadForm = document.querySelector("#lead-form");
const leadList = document.querySelector("#lead-list");
const emptyState = document.querySelector("#empty-state");
const searchInput = document.querySelector("#search-input");
const statusFilter = document.querySelector("#status-filter");
const sortOrder = document.querySelector("#sort-order");
const seedButton = document.querySelector("#seed-demo-data");
const template = document.querySelector("#lead-card-template");
const aiAssistant = document.querySelector("#ai-assistant");
const guardianPanel = document.querySelector("#guardian-panel");
const opsAgentStatus = document.querySelector("#ops-agent-status");

let leads = loadLeads();
let selectedLeadId = null;
let guardianLog = loadGuardianLog();
let remoteOpsState = {
  available: false,
  configured: false,
  model: "",
  lastError: ""
};

function scoreLead(lead) {
  let score = 40;
  const reasons = [];
  const notes = (lead.notes || "").toLowerCase();
  const history = (lead.history || []).join(" ").toLowerCase();

  if (lead.demoUrl) {
    score += 20;
    reasons.push("Demo link is ready to send on the call.");
  }

  if (lead.contact) {
    score += 10;
    reasons.push("You already have a named decision-maker or contact.");
  }

  if (lead.city) {
    score += 5;
    reasons.push("Lead record includes location context for personalization.");
  }

  if (lead.status === "interested") {
    score += 30;
    reasons.push("This lead has already shown buying intent.");
  }

  if (lead.status === "callback") {
    score += 18;
    reasons.push("There is an open callback window to capitalize on.");
  }

  if (lead.status === "ready-to-call") {
    score += 14;
    reasons.push("This lead is ready for active outreach now.");
  }

  if (lead.status === "not-interested") {
    score -= 30;
    reasons.push("Previous response was not interested, so priority should stay lower.");
  }

  if (/pickup|menu|maps|reviews|traffic|delivery|branding|online/.test(notes)) {
    score += 10;
    reasons.push("Notes mention a concrete website or marketing angle.");
  }

  if (/owner|manager|send|text|email|callback|interested/.test(history)) {
    score += 8;
    reasons.push("History suggests there is already some engagement to build on.");
  }

  if (reasons.length === 0) {
    reasons.push("Baseline priority only. Add notes, a contact name, or a demo link to improve targeting.");
  }

  return {
    total: Math.max(0, Math.min(100, score)),
    reasons: reasons.slice(0, 4)
  };
}

function getLeadInsights(lead) {
  const score = scoreLead(lead);
  const angle = lead.demoUrl
    ? "showing a live demo concept built specifically for the shop"
    : "offering to mock up a fast demo concept for the shop";
  const contactTarget = lead.contact || "the owner or manager";
  const locationLine = lead.city ? ` in ${lead.city}` : "";
  const statusLine = statusLabels[lead.status].toLowerCase();
  const nextStep = lead.demoUrl
    ? "Ask where to send the demo link and try to book a 5-minute walkthrough."
    : "Offer to create and send a custom homepage concept after the call.";

  const opener = `Hi, is ${contactTarget} available? This is Roy. I build conversion-focused websites for smoke shops${locationLine}, and I had an idea for ${lead.name}.`;
  const pitch = `The angle for this call is ${angle}. Keep it short and tie the offer to visibility, trust, and getting more walk-in traffic to notice the shop online.`;
  const followUp = lead.demoUrl
    ? `If they are receptive, say: "I already put together a quick demo for ${lead.name}. I can text it over now and walk you through it in under 5 minutes."`
    : `If they are receptive, say: "I can put together a quick homepage demo for ${lead.name} and send it over so you can see the direction before deciding anything."`;

  const objections = [
    "If they already have a site, frame your offer as an upgrade focused on conversion and visual trust.",
    "If they are busy, offer to text the link and follow up at a specific time.",
    "If they ask why you called them, mention that you work with local smoke shops and saw an opportunity to improve their web presence."
  ];

  if (lead.status === "callback") {
    objections.unshift("This is a callback lead, so reference the previous conversation early and confirm this is still a good time.");
  }

  if (lead.status === "interested") {
    objections.unshift("This lead is already warm. Move faster toward booking a walkthrough instead of re-selling the core value.");
  }

  return {
    score,
    opener,
    pitch,
    followUp,
    objections: objections.slice(0, 4),
    nextStep,
    context: `Priority score ${score.total}/100. Current status is ${statusLine}.`
  };
}

function setOpsStatus(message, tone = "fallback") {
  opsAgentStatus.textContent = message;
  opsAgentStatus.className = "ops-status";
  opsAgentStatus.dataset.tone = tone;
}

function getLeadRepairs(lead) {
  const repairs = [];
  const history = lead.history || [];
  const notes = (lead.notes || "").trim();

  if (!lead.demoUrl && lead.status !== "not-interested") {
    repairs.push("Create or attach a demo link so the call can end with a concrete next step.");
  }

  if (!lead.contact) {
    repairs.push("Capture the owner or manager name to make the next call feel warmer.");
  }

  if (lead.status === "callback" && history.length === 0) {
    repairs.push("Add a callback note with date or time so this lead does not stall.");
  }

  if (!notes) {
    repairs.push("Add one line about traffic, branding, menu, or reviews so the pitch stays specific.");
  }

  if (repairs.length === 0) {
    repairs.push("No obvious blockers. Keep this lead moving with the next call or demo walkthrough.");
  }

  return repairs.slice(0, 4);
}

function normalizeLead(lead) {
  const repairs = getLeadRepairs(lead);
  const notes = (lead.notes || "").trim();
  const history = Array.isArray(lead.history) ? lead.history : [];
  const nextLead = { ...lead };
  const applied = [];

  if (!nextLead.contact) {
    nextLead.contact = "Owner or manager";
    applied.push(`Filled missing contact for ${nextLead.name}.`);
  }

  if (!notes) {
    nextLead.notes = "Guardian note: personalize pitch around stronger online presence, trust, and local walk-in traffic.";
    applied.push(`Added a default pitch note for ${nextLead.name}.`);
  }

  if (nextLead.status === "new" && nextLead.demoUrl) {
    nextLead.status = "ready-to-call";
    applied.push(`Promoted ${nextLead.name} to Ready to Call.`);
  }

  if (nextLead.status === "callback" && history.length === 0) {
    nextLead.history = [`${new Date().toLocaleString()}: Guardian restored callback context and marked this lead for follow-up.`];
    applied.push(`Added missing callback history for ${nextLead.name}.`);
  }

  if (applied.length === 0 && repairs[0] !== "No obvious blockers. Keep this lead moving with the next call or demo walkthrough.") {
    nextLead.history = [
      `${new Date().toLocaleString()}: Guardian reviewed this lead and found no safe automatic edit beyond current state.`,
      ...history
    ];
    applied.push(`Reviewed ${nextLead.name} with no changes needed.`);
  }

  return { lead: nextLead, applied };
}

function analyzePipeline() {
  const issues = [];
  const total = leads.length;
  const callbacks = leads.filter((lead) => lead.status === "callback").length;
  const ready = leads.filter((lead) => lead.status === "ready-to-call").length;
  const missingDemo = leads.filter((lead) => !lead.demoUrl && lead.status !== "not-interested").length;
  const weakRecords = leads.filter((lead) => !lead.contact || !(lead.notes || "").trim()).length;
  const stalledCallbacks = leads.filter((lead) => lead.status === "callback" && (lead.history || []).length === 0).length;

  if (total === 0) {
    issues.push({
      severity: "high",
      title: "Pipeline is empty",
      detail: "There are no leads in the system, so outbound flow is fully blocked.",
      fixLabel: "Load sample leads or add new shops."
    });
  }

  if (missingDemo > 0) {
    issues.push({
      severity: "medium",
      title: "Leads without demos",
      detail: `${missingDemo} lead${missingDemo === 1 ? "" : "s"} do not have demo links, which weakens the call-to-action.`,
      fixLabel: "Guardian can generate placeholder demo links."
    });
  }

  if (weakRecords > 0) {
    issues.push({
      severity: "medium",
      title: "Weak lead records",
      detail: `${weakRecords} lead${weakRecords === 1 ? "" : "s"} are missing either contact names or positioning notes.`,
      fixLabel: "Guardian can fill safe defaults so you are not calling cold."
    });
  }

  if (stalledCallbacks > 0) {
    issues.push({
      severity: "high",
      title: "Stalled callbacks",
      detail: `${stalledCallbacks} callback lead${stalledCallbacks === 1 ? "" : "s"} have no callback context saved.`,
      fixLabel: "Guardian can restore follow-up notes immediately."
    });
  }

  if (ready === 0 && total > 0 && callbacks > 0) {
    issues.push({
      severity: "medium",
      title: "No active call queue",
      detail: "You have leads, but none are marked Ready to Call right now.",
      fixLabel: "Guardian can promote prepared leads back into the call queue."
    });
  }

  if (issues.length === 0) {
    issues.push({
      severity: "healthy",
      title: "Pipeline is flowing",
      detail: "No obvious blockers detected. The board is ready for calls and follow-ups.",
      fixLabel: "Keep logging outcomes so the guardian stays useful."
    });
  }

  return issues;
}

function renderGuardian() {
  const issues = analyzePipeline();
  const actionable = issues.filter((issue) => issue.severity !== "healthy").length;
  const highestScoreLead = [...leads].sort((a, b) => scoreLead(b).total - scoreLead(a).total)[0];

  guardianPanel.innerHTML = `
    <div class="guardian-header">
      <div>
        <p class="eyebrow">Guardian Status</p>
        <h3 class="assistant-title">${actionable === 0 ? "Stable pipeline" : `${actionable} issue${actionable === 1 ? "" : "s"} detected`}</h3>
        <p class="guardian-meta">${highestScoreLead ? `Best lead to call next: ${highestScoreLead.name} (score ${scoreLead(highestScoreLead).total}).` : "Add leads to activate guardian recommendations."}</p>
      </div>
      <div class="guardian-actions">
        <button id="guardian-fix-all" class="primary-btn" type="button">${remoteOpsState.configured ? "OpenAI Auto-Fix" : "Auto-Fix Safe Issues"}</button>
        <button id="guardian-focus-top" class="ghost-btn" type="button">${remoteOpsState.configured ? "OpenAI Coach Top Lead" : "Coach Top Lead"}</button>
      </div>
    </div>
    <div class="assistant-block">
      <p class="label">Current Issues</p>
      <ul class="guardian-list">
        ${issues
          .map(
            (issue) => `
              <li class="guardian-item">
                <strong>${issue.title}</strong>
                <span>${issue.detail}</span>
                <span>${issue.fixLabel}</span>
              </li>
            `
          )
          .join("")}
      </ul>
    </div>
    <div class="assistant-block">
      <p class="label">Recent Guardian Actions</p>
      <ul class="guardian-recent">
        ${
          guardianLog.length
            ? guardianLog.slice(0, 5).map((item) => `<li>${item}</li>`).join("")
            : "<li>No guardian repairs applied yet.</li>"
        }
      </ul>
    </div>
  `;

  const fixAllButton = document.querySelector("#guardian-fix-all");
  const focusTopButton = document.querySelector("#guardian-focus-top");

  fixAllButton?.addEventListener("click", () => {
    if (remoteOpsState.configured) {
      void runRemoteGuardianFixes();
      return;
    }

    applyGuardianFixes();
  });

  focusTopButton?.addEventListener("click", () => {
    if (!highestScoreLead) return;
    selectedLeadId = highestScoreLead.id;
    if (remoteOpsState.configured) {
      void refreshRemoteCoach(selectedLeadId);
      return;
    }

    renderAssistant();
  });
}

function applyGuardianFixes() {
  const nextLog = [];

  leads = leads.map((lead) => {
    const normalized = normalizeLead(lead);
    nextLog.push(...normalized.applied);
    return normalized.lead;
  });

  if (nextLog.length === 0) {
    nextLog.push(`${new Date().toLocaleString()}: Guardian scan found no safe automatic fixes to apply.`);
  } else {
    nextLog.unshift(`${new Date().toLocaleString()}: Guardian applied ${nextLog.length} repair action${nextLog.length === 1 ? "" : "s"}.`);
  }

  guardianLog = [...nextLog.reverse(), ...guardianLog].slice(0, 20);
  saveLeads();
  renderLeads();
}

function applyRemoteRepairs(repairs) {
  const nextLog = [];

  leads = leads.map((lead) => {
    const repair = repairs.find((item) => item.lead_id === lead.id);
    if (!repair) return lead;

    const changes = repair.changes || {};
    const nextLead = { ...lead };

    if (changes.contact && !nextLead.contact) {
      nextLead.contact = changes.contact;
    }

    if (changes.demoUrl && !nextLead.demoUrl) {
      nextLead.demoUrl = changes.demoUrl;
    }

    if (changes.status && (!nextLead.status || nextLead.status === "new")) {
      nextLead.status = changes.status;
    }

    if (changes.notes_append) {
      nextLead.notes = nextLead.notes
        ? `${nextLead.notes} ${changes.notes_append}`.trim()
        : changes.notes_append;
    }

    if (changes.history_append) {
      nextLead.history = [`${new Date().toLocaleString()}: ${changes.history_append}`, ...(nextLead.history || [])];
    }

    nextLog.push(`${repair.reason} (${nextLead.name})`);
    return nextLead;
  });

  if (nextLog.length === 0) {
    nextLog.push(`${new Date().toLocaleString()}: OpenAI ops agent reviewed the pipeline and suggested no safe automatic changes.`);
  } else {
    nextLog.unshift(`${new Date().toLocaleString()}: OpenAI ops agent applied ${nextLog.length} repair action${nextLog.length === 1 ? "" : "s"}.`);
  }

  guardianLog = [...nextLog.reverse(), ...guardianLog].slice(0, 20);
  saveLeads();
  renderLeads();
}

async function requestRemoteOpsAgent({ selectedLeadIdOverride = selectedLeadId } = {}) {
  const response = await fetch("/api/ops-agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      leads,
      selectedLeadId: selectedLeadIdOverride || "",
      guardianLog
    })
  });

  const payload = await response.json();
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || "OpenAI ops agent request failed.");
  }

  return payload;
}

async function refreshRemoteCoach(leadId) {
  selectedLeadId = leadId;
  aiAssistant.innerHTML = `<div class="assistant-empty">OpenAI is preparing live coaching for this lead...</div>`;

  try {
    const payload = await requestRemoteOpsAgent({ selectedLeadIdOverride: leadId });
    const coach = payload.result.coach;
    const targetLead = leads.find((item) => item.id === (coach.lead_id || leadId)) || leads.find((item) => item.id === leadId);

    if (!targetLead) {
      renderAssistant();
      return;
    }

    aiAssistant.innerHTML = `
      <div class="assistant-kicker">
        <div>
          <p class="eyebrow">OpenAI Live Coach</p>
          <h3 class="assistant-title">${targetLead.name}</h3>
        </div>
        <span class="score-pill">${payload.model}</span>
      </div>
      <div class="assistant-block">
        <p class="label">Context</p>
        <p>${payload.result.summary}</p>
      </div>
      <div class="assistant-block">
        <p class="label">Opener</p>
        <p>${coach.opener}</p>
      </div>
      <div class="assistant-block">
        <p class="label">Pitch Angle</p>
        <p>${coach.pitch_angle}</p>
      </div>
      <div class="assistant-block">
        <p class="label">Follow-Up Line</p>
        <p>${coach.follow_up}</p>
      </div>
      <div class="assistant-block">
        <p class="label">Next Step</p>
        <p>${coach.next_step}</p>
      </div>
      <div class="assistant-block">
        <p class="label">Objection Handling</p>
        <ul class="assistant-list">
          ${coach.objections.map((item) => `<li>${item}</li>`).join("")}
        </ul>
      </div>
    `;
  } catch (error) {
    remoteOpsState.lastError = error instanceof Error ? error.message : "Unknown OpenAI error.";
    setOpsStatus(`OpenAI ops agent error: ${remoteOpsState.lastError}. Using local coaching.`, "error");
    renderAssistant();
  }
}

async function runRemoteGuardianFixes() {
  try {
    guardianPanel.innerHTML = `<div class="assistant-empty">OpenAI ops agent is reviewing the pipeline and preparing safe fixes...</div>`;
    const payload = await requestRemoteOpsAgent();
    applyRemoteRepairs(payload.result.safe_repairs || []);

    if (payload.result.top_priority_lead_id) {
      selectedLeadId = payload.result.top_priority_lead_id;
      await refreshRemoteCoach(selectedLeadId);
    }
  } catch (error) {
    remoteOpsState.lastError = error instanceof Error ? error.message : "Unknown OpenAI error.";
    setOpsStatus(`OpenAI ops agent error: ${remoteOpsState.lastError}. Falling back to local guardian.`, "error");
    applyGuardianFixes();
  }
}

async function checkOpsAgentHealth() {
  try {
    const response = await fetch("/api/health");
    if (!response.ok) {
      throw new Error("Health check failed.");
    }

    const payload = await response.json();
    remoteOpsState = {
      available: true,
      configured: Boolean(payload.configured),
      model: payload.model || "",
      lastError: ""
    };

    if (payload.configured) {
      setOpsStatus(`OpenAI ops agent is live via ${payload.model}.`, "live");
    } else {
      setOpsStatus("Private AI access is not enabled for this browser. Using local coaching and safe fixes.", "fallback");
    }
  } catch {
    remoteOpsState = {
      available: false,
      configured: false,
      model: "",
      lastError: "Server unavailable"
    };
    setOpsStatus("OpenAI ops agent is offline. Start the local server to enable live coaching and repairs.", "fallback");
  }

  renderLeads();
}

function renderAssistant() {
  if (!selectedLeadId) {
    aiAssistant.innerHTML = `
      <div class="assistant-empty">
        Select "Coach Me" on any lead to generate a tailored opener, angle, and follow-up plan.
      </div>
    `;
    return;
  }

  const lead = leads.find((item) => item.id === selectedLeadId);
  if (!lead) {
    selectedLeadId = null;
    renderAssistant();
    return;
  }

  const insights = getLeadInsights(lead);
  aiAssistant.innerHTML = `
    <div class="assistant-kicker">
      <div>
        <p class="eyebrow">Active Lead</p>
        <h3 class="assistant-title">${lead.name}</h3>
      </div>
      <span class="score-pill">Score ${insights.score.total}</span>
    </div>
    <div class="assistant-block">
      <p class="label">Context</p>
      <p>${insights.context}</p>
    </div>
    <div class="assistant-block">
      <p class="label">Opener</p>
      <p>${insights.opener}</p>
    </div>
    <div class="assistant-block">
      <p class="label">Pitch Angle</p>
      <p>${insights.pitch}</p>
    </div>
    <div class="assistant-block">
      <p class="label">Follow-Up Line</p>
      <p>${insights.followUp}</p>
    </div>
    <div class="assistant-block">
      <p class="label">Next Step</p>
      <p>${insights.nextStep}</p>
    </div>
    <div class="assistant-block">
      <p class="label">Objection Handling</p>
      <ul class="assistant-list">
        ${insights.objections.map((item) => `<li>${item}</li>`).join("")}
      </ul>
    </div>
  `;
}

function loadLeads() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadGuardianLog() {
  const raw = localStorage.getItem(GUARDIAN_LOG_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLeads() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
  localStorage.setItem(GUARDIAN_LOG_KEY, JSON.stringify(guardianLog));
}

function renderStats() {
  const scoredLeads = leads.map((lead) => ({ ...lead, score: scoreLead(lead).total }));
  const interested = scoredLeads.filter((lead) => lead.status === "interested").length;
  const callbacks = scoredLeads.filter((lead) => lead.status === "callback").length;
  const ready = scoredLeads.filter((lead) => lead.status === "ready-to-call").length;
  const total = leads.length;
  const averageScore = total
    ? Math.round(scoredLeads.reduce((sum, lead) => sum + lead.score, 0) / total)
    : 0;

  heroStats.innerHTML = [
    { label: "Total leads", value: total },
    { label: "Ready to call", value: ready },
    { label: "Interested", value: interested },
    { label: "Avg. score", value: averageScore },
    { label: "Callbacks", value: callbacks }
  ]
    .map(
      (stat) => `
        <dl class="stat">
          <dt>${stat.label}</dt>
          <dd>${stat.value}</dd>
        </dl>
      `
    )
    .join("");
}

function matchesFilters(lead) {
  const query = searchInput.value.trim().toLowerCase();
  const status = statusFilter.value;

  const matchesStatus = status === "all" || lead.status === status;
  const matchesQuery =
    !query ||
    [lead.name, lead.contact, lead.phone, lead.city, lead.notes, ...(lead.history || [])]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(query));

  return matchesStatus && matchesQuery;
}

function renderLeads() {
  renderStats();
  renderAssistant();
  renderGuardian();
  leadList.innerHTML = "";

  const filtered = [...leads]
    .filter(matchesFilters);

  filtered.sort((a, b) => {
    if (sortOrder.value === "newest") {
      return new Date(b.createdAt) - new Date(a.createdAt);
    }

    if (sortOrder.value === "oldest") {
      return new Date(a.createdAt) - new Date(b.createdAt);
    }

    if (sortOrder.value === "name") {
      return a.name.localeCompare(b.name);
    }

    return scoreLead(b).total - scoreLead(a).total;
  });

  emptyState.hidden = filtered.length > 0;

  filtered.forEach((lead) => {
    const fragment = template.content.cloneNode(true);
    const card = fragment.querySelector(".lead-card");
    const score = scoreLead(lead);

    fragment.querySelector(".lead-name").textContent = lead.name;
    fragment.querySelector(".lead-meta").textContent = [lead.city, `Status: ${statusLabels[lead.status]}`]
      .filter(Boolean)
      .join(" - ");
    fragment.querySelector(".lead-contact").textContent = lead.contact || "No contact yet";
    fragment.querySelector(".lead-phone").textContent = lead.phone;
    fragment.querySelector(".lead-created").textContent = new Date(lead.createdAt).toLocaleString();
    fragment.querySelector(".lead-notes").textContent = lead.notes || "No notes yet.";

    const pill = fragment.querySelector(".status-pill");
    pill.textContent = statusLabels[lead.status];
    pill.dataset.tone = lead.status;

    fragment.querySelector(".score-pill").textContent = `Score ${score.total}`;

    const demoNode = fragment.querySelector(".lead-demo");
    if (lead.demoUrl) {
      demoNode.innerHTML = `<a href="${lead.demoUrl}" target="_blank" rel="noreferrer">Open demo link</a>`;
    } else {
      demoNode.textContent = "No demo link yet";
    }

    const statusSelect = fragment.querySelector(".lead-status-select");
    statusSelect.value = lead.status;
    statusSelect.addEventListener("change", (event) => {
      updateLead(lead.id, { status: event.target.value });
    });

    const scoreReasons = fragment.querySelector(".lead-score-reasons");
    score.reasons.forEach((reason) => {
      const li = document.createElement("li");
      li.textContent = reason;
      scoreReasons.appendChild(li);
    });

    const repairList = fragment.querySelector(".lead-repair-list");
    getLeadRepairs(lead).forEach((repair) => {
      const li = document.createElement("li");
      li.textContent = repair;
      repairList.appendChild(li);
    });

    const historyList = fragment.querySelector(".lead-history");
    const history = lead.history?.length ? lead.history : ["No call updates yet."];
    history.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      historyList.appendChild(li);
    });

    const saveLogButton = fragment.querySelector(".lead-log-save");
    const logInput = fragment.querySelector(".lead-log-input");
    saveLogButton.addEventListener("click", () => {
      const value = logInput.value.trim();
      if (!value) return;

      const timestamp = new Date().toLocaleString();
      const nextHistory = [`${timestamp}: ${value}`, ...(lead.history || [])];
      updateLead(lead.id, { history: nextHistory });
    });

    fragment.querySelector(".lead-coach").addEventListener("click", () => {
      selectedLeadId = lead.id;
      if (remoteOpsState.configured) {
        void refreshRemoteCoach(lead.id);
        return;
      }

      renderAssistant();
    });

    fragment.querySelector(".lead-delete").addEventListener("click", () => {
      leads = leads.filter((item) => item.id !== lead.id);
      saveLeads();
      renderLeads();
    });

    card.dataset.id = lead.id;
    leadList.appendChild(fragment);
  });
}

function updateLead(id, updates) {
  leads = leads.map((lead) => (lead.id === id ? { ...lead, ...updates } : lead));
  saveLeads();
  renderLeads();
}

leadForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(leadForm);

  const lead = {
    id: crypto.randomUUID(),
    name: String(formData.get("name") || "").trim(),
    contact: String(formData.get("contact") || "").trim(),
    phone: String(formData.get("phone") || "").trim(),
    city: String(formData.get("city") || "").trim(),
    demoUrl: String(formData.get("demoUrl") || "").trim(),
    status: String(formData.get("status") || "new"),
    notes: String(formData.get("notes") || "").trim(),
    createdAt: new Date().toISOString(),
    history: []
  };

  leads = [lead, ...leads];
  saveLeads();
  leadForm.reset();
  renderLeads();
});

searchInput.addEventListener("input", renderLeads);
statusFilter.addEventListener("change", renderLeads);
sortOrder.addEventListener("change", renderLeads);

seedButton.addEventListener("click", () => {
  if (leads.length > 0 && !window.confirm("Replace your current in-browser leads with sample data?")) {
    return;
  }

  leads = structuredClone(sampleLeads);
  saveLeads();
  renderLeads();
});

renderLeads();
void checkOpsAgentHealth();
