import { loadAllAssessments, loadTeams } from "./storage.js";
import { compute } from "./compute.js";

const qs = (id) => document.getElementById(id);

function getId() {
  return new URLSearchParams(location.search).get("id") || "";
}

const id = getId();
const assessments = loadAllAssessments();
const teams = loadTeams();
const a = assessments.find(x => x.id === id);

if (!a) {
  document.body.innerHTML = `<div style="color:white;padding:24px;font-family:system-ui">No assessment found. Open from Dashboard.</div>`;
} else {
  qs("btnEdit").href = `./survey.html?id=${encodeURIComponent(a.id)}`;

  const teamName = a.engineer?.teamId ? (teams.find(t => t.id === a.engineer.teamId)?.name || "(deleted team)") : "(no team)";
  const c = compute(a);

  qs("rName").textContent = a.engineer?.name || "(unnamed engineer)";
  qs("rMeta").textContent = `${a.engineer?.role || "—"} • ${a.engineer?.period || "—"} • team ${teamName}`;
  qs("rScore").textContent = `Overall mean: ${c.overallMean ?? "N/A"}/10`;
  qs("rNotes").textContent = a.notes || "—";

  // table
  const tbody = qs("tbl");
  tbody.innerHTML = "";
  c.axisOverall.forEach(ax => {
    const tr = document.createElement("tr");
    tr.className = "border-t border-white/10";

    const tdA = td(ax.label);
    const tdO = td(ax.mean == null ? "N/A" : `${ax.mean}/10`);
    const tdT = td(ax.total == null ? "N/A" : `${ax.total}/100`);
    const slices = Object.entries(ax.tagAverages).map(([k,v]) => `${k}:${v}`).join(" • ") || "—";
    const tdS = td(slices, "text-white/75");

    tr.appendChild(tdA); tr.appendChild(tdO); tr.appendChild(tdT); tr.appendChild(tdS);
    tbody.appendChild(tr);
  });

  function td(text, extra="") {
    const t = document.createElement("td");
    t.className = `py-2 pr-4 text-white/85 ${extra}`;
    t.textContent = text;
    return t;
  }

  // chart
  const ctx = document.getElementById("radar");
  const chart = new Chart(ctx, {
    type: "radar",
    data: {
      labels: c.labels,
      datasets: [
        ds("Overall", c.series.overall, "rgba(255,255,255,0.9)", "rgba(255,255,255,0.16)"),
        ds("Scenario", c.series.scenario, "rgba(96,165,250,0.95)", "rgba(96,165,250,0.10)"),
        ds("SOC", c.series.soc, "rgba(52,211,153,0.95)", "rgba(52,211,153,0.08)"),
        ds("Pentest", c.series.pt, "rgba(244,63,94,0.95)", "rgba(244,63,94,0.08)"),
      ],
    },
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
      plugins: {
        legend: { labels: { color: "rgba(255,255,255,0.8)" } },
      }
    }
  });

  function ds(label, data, stroke, fill) {
    return { label, data, borderColor: stroke, backgroundColor: fill, borderWidth: 2, pointRadius: 2, spanGaps: true };
  }

  // PNG
  qs("btnPng").onclick = () => {
    const url = chart.toBase64Image("image/png", 1);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(a.engineer.name || "engineer").replace(/\s+/g, "_")}_radar.png`;
    link.click();
  };

  // Print
  qs("btnPrint").onclick = () => window.print();

  // PDF
  qs("btnPdf").onclick = async () => {
    const root = qs("reportRoot");
    const canvas = await html2canvas(root, { backgroundColor: "#07070a", scale: 2 });
    const img = canvas.toDataURL("image/png");

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("p", "pt", "a4");

    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    const imgW = pageW;
    const imgH = (canvas.height * pageW) / canvas.width;

    let heightLeft = imgH;
    let position = 0;

    pdf.addImage(img, "PNG", 0, position, imgW, imgH);
    heightLeft -= pageH;

    while (heightLeft > 0) {
      position = heightLeft - imgH;
      pdf.addPage();
      pdf.addImage(img, "PNG", 0, position, imgW, imgH);
      heightLeft -= pageH;
    }

    pdf.save(`${(a.engineer.name || "engineer").replace(/\s+/g, "_")}_report.pdf`);
  };
}
