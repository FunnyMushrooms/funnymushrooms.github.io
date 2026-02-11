import { AXES } from "./questions.js";
import { loadAll, saveAll, upsert } from "./storage.js";
import { compute } from "./compute.js";
import { el, downloadJson } from "./ui.js";

let assessments = loadAll();
let selected = null;

const qs = (id) => document.getElementById(id);

const list = qs("list");
const fileImportMany = qs("fileImportMany");

const detailName = qs("detailName");
const detailMeta = qs("detailMeta");
const detailDomains = qs("detailDomains");
const detailTable = qs("detailTable");

const btnExportOne = qs("btnExportOne");
const btnEdit = qs("btnEdit");

function renderList() {
  list.innerHTML = "";
  if (!assessments.length) {
    list.appendChild(el("div", "text-sm text-white/60", "No assessments yet. Import JSON(s) or create a new survey."));
    return;
  }

  assessments.slice(0, 50).forEach(a => {
    const c = compute(a);
    const b = el("button", "w-full text-left card p-4 hover:bg-white/10 transition");
    const top = el("div", "flex items-center justify-between gap-3");
    const left = el("div", "");
    left.appendChild(el("div", "text-sm font-extrabold", a.engineer?.name || "(unnamed engineer)"));
    left.appendChild(el("div", "text-xs text-white/60 mt-1", `${a.engineer?.role || "—"} • ${a.engineer?.period || "—"}`));
    top.appendChild(left);
    top.appendChild(el("span", "pill", `${c.overallMean}/10`));
    b.appendChild(top);

    b.onclick = () => {
      selected = a;
      renderDetails();
    };
    list.appendChild(b);
  });
}

function renderDetails() {
  if (!selected) return;

  const c = compute(selected);
  detailName.textContent = selected.engineer?.name || "(unnamed engineer)";
  detailMeta.textContent = `${selected.engineer?.role || "—"} • ${selected.engineer?.period || "—"} • overall mean ${c.overallMean}/10`;

  detailDomains.innerHTML = "";
  (selected.engineer?.domains || []).forEach(d => detailDomains.appendChild(el("span", "pill", d)));

  detailTable.innerHTML = "";
  c.axisOverall.forEach(ax => {
    const tr = document.createElement("tr");
    tr.className = "border-t border-white/10";

    const tdA = el("td", "py-2 pr-4 text-white/85", ax.label);
    const tdO = el("td", "py-2 pr-4 text-white/85", `${ax.mean}/10`);
    const tdT = el("td", "py-2 pr-4 text-white/85", `${Math.round(ax.total)}/100`);

    const slices = Object.entries(ax.tagAverages)
      .map(([k,v]) => `${k}:${v}`)
      .join(" • ");

    const tdS = el("td", "py-2 pr-4 text-white/75", slices || "—");

    tr.appendChild(tdA);
    tr.appendChild(tdO);
    tr.appendChild(tdT);
    tr.appendChild(tdS);

    detailTable.appendChild(tr);
  });

  btnExportOne.disabled = false;
  btnEdit.href = `./survey.html?id=${encodeURIComponent(selected.id)}`;
  btnEdit.setAttribute("aria-disabled", "false");
}

btnExportOne.onclick = () => {
  if (!selected) return;
  const computed = compute(selected);
  const payload = {
    ...selected,
    computed,
    schema: {
      axes: AXES.map(ax => ({
        id: ax.id,
        name: ax.name,
        questions: ax.questions.map(q => ({ id: q.id, tag: q.tag, text: q.text })),
      })),
    },
  };
  downloadJson(`${(selected.engineer.name || "engineer").replace(/\s+/g, "_")}_assessment.json`, payload);
};

async function importMany(files) {
  for (const f of files) {
    const text = await f.text();
    try {
      const data = JSON.parse(text);
      const imported = {
        version: 1,
        id: data.id || (crypto?.randomUUID?.() ?? String(Date.now())),
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        engineer: data.engineer || { name:"", role:"", period:"", mainDirection:"", additionalDirection:[], domains:[] },
        notes: data.notes || "",
        answers: data.answers || {},
      };
      assessments = upsert(assessments, imported);
    } catch {
      // skip invalid
    }
  }
  saveAll(assessments);
  renderList();
}

fileImportMany.onchange = async (e) => {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;
  await importMany(files);
  e.target.value = "";
};

renderList();
