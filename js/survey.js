import { AXES } from "./questions.js";
import { loadAll, saveAll, getCurrentId, setCurrentId, upsert } from "./storage.js";
import { makeBlankAssessment, compute } from "./compute.js";
import { el, tagClass, btnToggle, downloadJson } from "./ui.js";

let assessments = loadAll();
let currentId = getCurrentId();
let current = assessments.find(a => a.id === currentId) || null;

const qs = (id) => document.getElementById(id);

const axisTabs = qs("axisTabs");
const questionsWrap = qs("questions");
const axisTitle = qs("axisTitle");
const axisScore = qs("axisScore");
const savedAt = qs("savedAt");

const engName = qs("engName");
const engRole = qs("engRole");
const engPeriod = qs("engPeriod");
const engNotes = qs("engNotes");

const btnNew = qs("btnNew");
const btnExport = qs("btnExport");
const fileImport = qs("fileImport");
const btnDownloadPng = qs("btnDownloadPng");
const overlayToggles = qs("overlayToggles");

let activeAxisId = "windows";
let chart = null;

function ensureCurrent() {
  if (!current) {
    current = makeBlankAssessment();
    assessments = upsert(assessments, current);
    currentId = current.id;
    setCurrentId(currentId);
    persist();
  }
}

function persist() {
  current.updatedAt = new Date().toISOString();
  assessments = upsert(assessments, current);
  saveAll(assessments);
  setCurrentId(current.id);
  savedAt.textContent = "Saved " + new Date().toLocaleTimeString();
}

function setAnswer(qid, val) {
  current.answers[qid] = Math.max(1, Math.min(10, Number(val) || 1));
  persist();
  renderAxis();
  renderChart();
}

function renderTabs() {
  axisTabs.innerHTML = "";
  AXES.forEach(a => {
    const b = el("button", activeAxisId === a.id ? "btn-primary" : "btn", a.name);
    b.onclick = () => { activeAxisId = a.id; renderAxis(); };
    axisTabs.appendChild(b);
  });
}

function renderProfile() {
  engName.value = current.engineer.name || "";
  engRole.value = current.engineer.role || "";
  engPeriod.value = current.engineer.period || "";
  engNotes.value = current.notes || "";

  const sync = () => {
    current.engineer.name = engName.value.trim();
    current.engineer.role = engRole.value.trim();
    current.engineer.period = engPeriod.value.trim();
    current.notes = engNotes.value;
    persist();
    renderChart();
  };

  engName.oninput = sync;
  engRole.oninput = sync;
  engPeriod.oninput = sync;
  engNotes.oninput = sync;
}

function questionCard(axis, q, idx) {
  const card = el("div", "card p-4");
  const top = el("div", "flex items-start justify-between gap-4");
  const left = el("div", "space-y-2");

  const header = el("div", "flex items-center gap-2");
  header.appendChild(el("span", tagClass(q.tag), q.tag));
  header.appendChild(el("div", "text-sm font-extrabold text-white/90", `Q${idx+1}`));
  left.appendChild(header);

  left.appendChild(el("div", "text-sm text-white/80 leading-relaxed", q.text));

  const right = el("div", "w-64 max-w-[45%] space-y-2");
  const value = current.answers[q.id] ?? 5;

  const row = el("div", "flex items-center gap-3");
  const slider = el("input", "w-full");
  slider.type = "range";
  slider.min = "1";
  slider.max = "10";
  slider.value = String(value);

  const num = el("input", "input w-16 text-center font-extrabold");
  num.value = String(value);

  slider.oninput = () => { num.value = slider.value; setAnswer(q.id, slider.value); };
  num.onchange = () => { slider.value = String(num.value); setAnswer(q.id, num.value); };

  row.appendChild(slider);
  row.appendChild(num);
  right.appendChild(row);

  top.appendChild(left);
  top.appendChild(right);
  card.appendChild(top);

  return card;
}

function renderAxis() {
  const axis = AXES.find(a => a.id === activeAxisId) || AXES[0];

  axisTitle.textContent = axis.name;
  questionsWrap.innerHTML = "";

  axis.questions.forEach((q, idx) => {
    questionsWrap.appendChild(questionCard(axis, q, idx));
  });

  const c = compute(current);
  const ax = c.axisOverall.find(x => x.axisId === axis.id);
  axisScore.textContent = `${ax.total}/100 • ${ax.mean}/10`;
}

function initChart() {
  const ctx = document.getElementById("radar");
  chart = new Chart(ctx, {
    type: "radar",
    data: { labels: [], datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          suggestedMin: 0,
          suggestedMax: 10,
          grid: { color: "rgba(255,255,255,0.12)" },
          angleLines: { color: "rgba(255,255,255,0.12)" },
          pointLabels: { color: "rgba(255,255,255,0.78)", font: { size: 12 } },
          ticks: { color: "rgba(255,255,255,0.55)", backdropColor: "transparent" },
        }
      },
      plugins: {
        legend: { labels: { color: "rgba(255,255,255,0.8)" } },
        tooltip: {
          backgroundColor: "#0b0b10",
          borderColor: "rgba(255,255,255,0.12)",
          borderWidth: 1,
          titleColor: "rgba(255,255,255,0.9)",
          bodyColor: "rgba(255,255,255,0.85)",
        }
      }
    }
  });
}

const overlayState = {
  Overall: true,
  Scenario: true,
  SOC: true,
  Pentest: true,
  Team: false,
  Comms: false,
  English: false,
};

function renderOverlayToggles() {
  overlayToggles.innerHTML = "";
  Object.keys(overlayState).forEach(k => {
    const b = btnToggle(k, overlayState[k]);
    b.onclick = () => {
      overlayState[k] = !overlayState[k];
      renderOverlayToggles();
      renderChart();
    };
    overlayToggles.appendChild(b);
  });
}

function renderChart() {
  const c = compute(current);
  const { labels, series } = c;

  const datasets = [];
  if (overlayState.Overall) datasets.push(ds("Overall", series.overall, "rgba(255,255,255,0.9)", "rgba(255,255,255,0.16)"));
  if (overlayState.Scenario) datasets.push(ds("Scenario", series.scenario, "rgba(96,165,250,0.95)", "rgba(96,165,250,0.10)"));
  if (overlayState.SOC) datasets.push(ds("SOC", series.soc, "rgba(52,211,153,0.95)", "rgba(52,211,153,0.08)"));
  if (overlayState.Pentest) datasets.push(ds("Pentest", series.pt, "rgba(244,63,94,0.95)", "rgba(244,63,94,0.08)"));
  if (overlayState.Team) datasets.push(ds("Team", series.team, "rgba(167,139,250,0.95)", "rgba(167,139,250,0.08)"));
  if (overlayState.Comms) datasets.push(ds("Comms", series.comms, "rgba(251,191,36,0.95)", "rgba(251,191,36,0.08)"));
  if (overlayState.English) datasets.push(ds("English", series.en, "rgba(34,211,238,0.95)", "rgba(34,211,238,0.08)"));

  chart.data.labels = labels;
  chart.data.datasets = datasets;
  chart.update();
}

function ds(label, data, stroke, fill) {
  return {
    label,
    data,
    borderColor: stroke,
    backgroundColor: fill,
    borderWidth: 2,
    pointRadius: 2,
    pointHoverRadius: 3,
    spanGaps: true,
  };
}

async function handleImport(file) {
  const text = await file.text();
  const data = JSON.parse(text);

  // accept raw or exported payload
  const blank = makeBlankAssessment();
  const imported = {
    version: 1,
    id: data.id || (crypto?.randomUUID?.() ?? String(Date.now())),
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    engineer: data.engineer || blank.engineer,
    notes: data.notes || "",
    answers: data.answers || blank.answers,
  };

  // ensure all qids exist
  for (const k of Object.keys(blank.answers)) {
    if (imported.answers[k] === undefined) imported.answers[k] = blank.answers[k];
  }

  current = imported;
  assessments = upsert(assessments, current);
  currentId = current.id;
  persist();
  renderProfile();
  renderAxis();
  renderChart();
}

function downloadPng() {
  const url = chart.toBase64Image("image/png", 1);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(current.engineer.name || "engineer").replace(/\s+/g, "_")}_radar.png`;
  a.click();
}

function exportJson() {
  const computed = compute(current);
  const payload = {
    ...current,
    computed,
    schema: {
      axes: AXES.map(ax => ({
        id: ax.id,
        name: ax.name,
        questions: ax.questions.map(q => ({ id: q.id, tag: q.tag, text: q.text })),
      })),
    },
  };
  downloadJson(`${(current.engineer.name || "engineer").replace(/\s+/g, "_")}_assessment.json`, payload);
}

// Boot
ensureCurrent();
renderTabs();
renderProfile();
renderAxis();
initChart();
renderOverlayToggles();
renderChart();

btnNew.onclick = () => {
  current = makeBlankAssessment();
  assessments = upsert(assessments, current);
  currentId = current.id;
  setCurrentId(currentId);
  persist();
  renderProfile();
  renderAxis();
  renderChart();
};

btnExport.onclick = exportJson;
btnDownloadPng.onclick = downloadPng;

fileImport.onchange = async (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  await handleImport(f);
  e.target.value = "";
};
