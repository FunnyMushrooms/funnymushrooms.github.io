import { AXES } from "./questions.js";
import {
  loadAllAssessments, saveAllAssessments,
  loadTeams,
  upsert, removeById,
  exportBackupPayload
} from "./storage.js";
import { compute } from "./compute.js";
import { el, downloadJson } from "./ui.js";

let assessments = loadAllAssessments();
let teams = loadTeams();
let selected = null;

const qs = (id) => document.getElementById(id);

const list = qs("list");
const fileImportMany = qs("fileImportMany");
const dropzone = qs("dropzone");
const teamFilter = qs("teamFilter");

const detailName = qs("detailName");
const detailMeta = qs("detailMeta");
const detailDomains = qs("detailDomains");
const detailTable = qs("detailTable");

const btnExportOne = qs("btnExportOne");
const btnDeleteOne = qs("btnDeleteOne");
const btnEdit = qs("btnEdit");
const btnReport = qs("btnReport");

const btnCompareSelected = qs("btnCompareSelected");
const btnDeleteSelected = qs("btnDeleteSelected");
const btnExportBackup = qs("btnExportBackup");

const selectedSet = new Set();

function teamNameById(id) {
  if (!id) return "(no team)";
  return teams.find(t => t.id === id)?.name || "(deleted team)";
}

function renderTeamFilter() {
  teams = loadTeams();
  teamFilter.innerHTML = `<option value="">All teams</option>`;
  teamFilter.appendChild(new Option("(no team)", "__none__"));
  teams.forEach(t => teamFilter.appendChild(new Option(t.name, t.id)));
}

function filteredAssessments() {
  const tf = teamFilter.value;
  if (!tf) return assessments;
  if (tf === "__none__") return assessments.filter(a => !a.engineer?.teamId);
  return assessments.filter(a => a.engineer?.teamId === tf);
}

function updateSelectionButtons() {
  const n = selectedSet.size;
  btnCompareSelected.disabled = n < 2;
  btnDeleteSelected.disabled = n < 1;
}

function renderList() {
  list.innerHTML = "";
  const items = filteredAssessments();

  if (!items.length) {
    list.appendChild(el("div", "text-sm text-white/60", "No assessments here. Import JSON(s) or create a new survey."));
    return;
  }

  items.slice(0, 80).forEach(a => {
    const c = compute(a);
    const row = el("div", "card p-4 flex items-start gap-3");

    const cb = el("input", "");
    cb.type = "checkbox";
    cb.checked = selectedSet.has(a.id);
    cb.onchange = () => {
      if (cb.checked) selectedSet.add(a.id);
      else selectedSet.delete(a.id);
      updateSelectionButtons();
    };

    const btn = el("button", "flex-1 text-left");
    const top = el("div", "flex items-center justify-between gap-3");
    const left = el("div", "");
    left.appendChild(el("div", "text-sm font-extrabold", a.engineer?.name || "(unnamed engineer)"));
    left.appendChild(el("div", "text-xs text-white/60 mt-1",
      `${a.engineer?.role || "—"} • ${a.engineer?.period || "—"} • ${teamNameById(a.engineer?.teamId)}`
    ));
    top.appendChild(left);
    top.appendChild(el("span", "pill", `${c.overallMean ?? "N/A"}/10`));
    btn.appendChild(top);

    btn.onclick = () => { selected = a; renderDetails(); };

    const del = el("button", "btn-danger", "Del");
    del.onclick = () => {
      const ok = confirm(`Delete assessment for "${a.engineer?.name || "unnamed"}"?`);
      if (!ok) return;
      assessments = removeById(assessments, a.id);
      saveAllAssessments(assessments);
      selectedSet.delete(a.id);
      if (selected?.id === a.id) selected = null;
      renderList(); renderDetails(); updateSelectionButtons();
    };

    row.appendChild(cb);
    row.appendChild(btn);
    row.appendChild(del);
    list.appendChild(row);
  });
}

function renderDetails() {
  if (!selected) {
    detailName.textContent = "(select an engineer)";
    detailMeta.textContent = "—";
    detailDomains.innerHTML = "";
    detailTable.innerHTML = "";
    btnExportOne.disabled = true;
    btnDeleteOne.disabled = true;
    btnEdit.setAttribute("aria-disabled", "true");
    btnReport.setAttribute("aria-disabled", "true");
    btnEdit.href = "./survey.html";
    btnReport.href = "./report.html";
    return;
  }

  const c = compute(selected);
  detailName.textContent = selected.engineer?.name || "(unnamed engineer)";
  detailMeta.textContent =
    `${selected.engineer?.role || "—"} • ${selected.engineer?.period || "—"} • team ${teamNameById(selected.engineer?.teamId)} • overall ${c.overallMean ?? "N/A"}/10`;

  detailDomains.innerHTML = "";
  (selected.engineer?.domains || []).forEach(d => detailDomains.appendChild(el("span", "pill", d)));

  detailTable.innerHTML = "";
  c.axisOverall.forEach(ax => {
    const tr = document.createElement("tr");
    tr.className = "border-t border-white/10";

    const tdA = el("td", "py-2 pr-4 text-white/85", ax.label);
    const tdO = el("td", "py-2 pr-4 text-white/85", ax.mean == null ? "N/A" : `${ax.mean}/10`);
    const tdT = el("td", "py-2 pr-4 text-white/85", ax.total == null ? "N/A" : `${ax.total}/100`);

    const slices = Object.entries(ax.tagAverages)
      .map(([k,v]) => `${k}:${v}`)
      .join(" • ");

    const tdS = el("td", "py-2 pr-4 text-white/75", slices || "—");

    tr.appendChild(tdA); tr.appendChild(tdO); tr.appendChild(tdT); tr.appendChild(tdS);
    detailTable.appendChild(tr);
  });

  btnExportOne.disabled = false;
  btnDeleteOne.disabled = false;
  btnEdit.href = `./survey.html?id=${encodeURIComponent(selected.id)}`;
  btnReport.href = `./report.html?id=${encodeURIComponent(selected.id)}`;
  btnEdit.setAttribute("aria-disabled", "false");
  btnReport.setAttribute("aria-disabled", "false");
}

btnExportOne.onclick = () => {
  if (!selected) return;
  const computed = compute(selected);
  const payload = {
    ...selected,
    computed,
    schema: { axes: AXES.map(ax => ({ id: ax.id, name: ax.name, questions: ax.questions.map(q => ({ id:q.id, tag:q.tag, text:q.text })) })) },
  };
  downloadJson(`${(selected.engineer.name || "engineer").replace(/\s+/g, "_")}_assessment.json`, payload);
};

btnDeleteOne.onclick = () => {
  if (!selected) return;
  const ok = confirm(`Delete assessment for "${selected.engineer?.name || "unnamed"}"?`);
  if (!ok) return;
  assessments = removeById(assessments, selected.id);
  saveAllAssessments(assessments);
  selectedSet.delete(selected.id);
  selected = null;
  renderList(); renderDetails(); updateSelectionButtons();
};

btnCompareSelected.onclick = () => {
  const ids = Array.from(selectedSet);
  if (ids.length < 2) return;
  location.href = `./compare.html?ids=${encodeURIComponent(ids.join(","))}`;
};

btnDeleteSelected.onclick = () => {
  const ids = Array.from(selectedSet);
  if (!ids.length) return;
  const ok = confirm(`Delete ${ids.length} selected assessments?`);
  if (!ok) return;
  assessments = assessments.filter(a => !selectedSet.has(a.id));
  saveAllAssessments(assessments);
  selectedSet.clear();
  selected = null;
  renderList(); renderDetails(); updateSelectionButtons();
};

btnExportBackup.onclick = () => {
  downloadJson(`cyber_skills_backup_${new Date().toISOString().slice(0,10)}.json`, exportBackupPayload());
};

async function importMany(files) {
  for (const f of files) {
    const text = await f.text();
    try {
      const data = JSON.parse(text);

      // If it's a backup, merge it (simple approach: replace all)
      if (Array.isArray(data?.assessments) && Array.isArray(data?.teams)) {
        // Replace store entirely
        localStorage.setItem("cyber_survey_assessments_v2", JSON.stringify(data.assessments));
        localStorage.setItem("cyber_survey_teams_v1", JSON.stringify(data.teams));
        assessments = loadAllAssessments();
        teams = loadTeams();
        continue;
      }

      const imported = {
        version: 2,
        id: data.id || (crypto?.randomUUID?.() ?? String(Date.now())),
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        engineer: data.engineer || { name:"", role:"", period:"", teamId:"", mainDirection:"", additionalDirection:[], domains:[] },
        notes: data.notes || "",
        answers: data.answers || {},
      };
      assessments = upsert(assessments, imported);
    } catch {
      // ignore invalid
    }
  }
  saveAllAssessments(assessments);
  renderTeamFilter();
  renderList();
  renderDetails();
}

fileImportMany.onchange = async (e) => {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;
  await importMany(files);
  e.target.value = "";
};

// Drag & drop
dropzone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropzone.classList.add("dragover");
});
dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));
dropzone.addEventListener("drop", async (e) => {
  e.preventDefault();
  dropzone.classList.remove("dragover");
  const files = Array.from(e.dataTransfer.files || []).filter(f => f.name.endsWith(".json"));
  if (files.length) await importMany(files);
});

teamFilter.onchange = () => renderList();

// boot
renderTeamFilter();
renderList();
renderDetails();
updateSelectionButtons();
