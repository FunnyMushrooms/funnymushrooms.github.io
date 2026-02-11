import { loadAllAssessments, loadTeams } from "./storage.js";
import { compute } from "./compute.js";

const qs = (id) => document.getElementById(id);
const assessments = loadAllAssessments();
const teams = loadTeams();

const teamPick = qs("teamPick");
const pickList = qs("pickList");
const btnBuild = qs("btnBuild");
const meta = qs("meta");
const included = qs("included");
const btnPng = qs("btnPng");

let chart = null;
const picked = new Set();

function qIdsFromUrl() {
  const ids = new URLSearchParams(location.search).get("ids");
  if (!ids) return [];
  return ids.split(",").map(s => s.trim()).filter(Boolean);
}

function teamName(id) {
  if (!id) return "(no team)";
  return teams.find(t => t.id === id)?.name || "(deleted team)";
}

function renderTeamPick() {
  teamPick.innerHTML = "";
  teamPick.appendChild(new Option("All teams", ""));
  teamPick.appendChild(new Option("(no team)", "__none__"));
  teams.forEach(t => teamPick.appendChild(new Option(t.name, t.id)));
}

function filtered() {
  const tf = teamPick.value;
  if (!tf) return assessments;
  if (tf === "__none__") return assessments.filter(a => !a.engineer?.teamId);
  return assessments.filter(a => a.engineer?.teamId === tf);
}

function renderPickList() {
  pickList.innerHTML = "";
  filtered().slice(0, 120).forEach(a => {
    const row = document.createElement("label");
    row.className = "card p-4 flex items-start gap-3 cursor-pointer hover:bg-white/10 transition";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = picked.has(a.id);
    cb.onchange = () => cb.checked ? picked.add(a.id) : picked.delete(a.id);

    const box = document.createElement("div");
    box.innerHTML = `<div class="text-sm font-extrabold">${a.engineer?.name || "(unnamed)"}</div>
      <div class="text-xs text-white/60 mt-1">${a.engineer?.role || "—"} • ${teamName(a.engineer?.teamId)}</div>`;
    row.appendChild(cb);
    row.appendChild(box);
    pickList.appendChild(row);
  });
}

function avgIgnoreNull(arr) {
  const v = arr.filter(x => x != null);
  if (!v.length) return null;
  return Math.round((v.reduce((a,b)=>a+b,0) / v.length + Number.EPSILON) * 10) / 10;
}

function buildAggregate(selectedAssessments) {
  // Aggregate by averaging axis means across selected engineers.
  const computedList = selectedAssessments.map(a => compute(a));
  const labels = computedList[0]?.labels || [];

  const pickSeries = (key) => {
    const byAxis = labels.map((_, i) => {
      const vals = computedList.map(c => c.series[key][i]);
      return avgIgnoreNull(vals);
    });
    return byAxis;
  };

  return {
    labels,
    series: {
      overall: pickSeries("overall"),
      scenario: pickSeries("scenario"),
      soc: pickSeries("soc"),
      pt: pickSeries("pt"),
    }
  };
}

function initChart() {
  const ctx = document.getElementById("radar");
  chart = new Chart(ctx, {
    type: "radar",
    data: { labels: [], datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      spanGaps: true,
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
      plugins: { legend: { labels: { color: "rgba(255,255,255,0.8)" } } }
    }
  });
}

function ds(label, data, stroke, fill) {
  return { label, data, borderColor: stroke, backgroundColor: fill, borderWidth: 2, pointRadius: 2, spanGaps: true };
}

function renderAggregate() {
  const ids = Array.from(picked);
  const selected = assessments.filter(a => ids.includes(a.id));
  if (selected.length < 2) {
    meta.textContent = "Pick at least 2 engineers.";
    included.innerHTML = "";
    return;
  }

  const agg = buildAggregate(selected);
  chart.data.labels = agg.labels;
  chart.data.datasets = [
    ds("Overall (avg)", agg.series.overall, "rgba(255,255,255,0.9)", "rgba(255,255,255,0.16)"),
    ds("Scenario (avg)", agg.series.scenario, "rgba(96,165,250,0.95)", "rgba(96,165,250,0.10)"),
    ds("SOC (avg)", agg.series.soc, "rgba(52,211,153,0.95)", "rgba(52,211,153,0.08)"),
    ds("Pentest (avg)", agg.series.pt, "rgba(244,63,94,0.95)", "rgba(244,63,94,0.08)"),
  ];
  chart.update();

  meta.textContent = `Comparing ${selected.length} engineers`;
  included.innerHTML = "";
  selected.forEach(a => {
    const s = document.createElement("span");
    s.className = "pill";
    s.textContent = a.engineer?.name || "(unnamed)";
    included.appendChild(s);
  });
}

btnBuild.onclick = renderAggregate;
btnPng.onclick = () => {
  const url = chart.toBase64Image("image/png", 1);
  const link = document.createElement("a");
  link.href = url;
  link.download = `comparison_radar.png`;
  link.click();
};

teamPick.onchange = () => renderPickList();

renderTeamPick();
initChart();

// Preselect from URL if provided
qIdsFromUrl().forEach(id => picked.add(id));
renderPickList();
if (picked.size >= 2) renderAggregate();
