import { loadTeams, saveTeams, loadAllAssessments, saveAllAssessments, removeById } from "./storage.js";

const qs = (id) => document.getElementById(id);

const teamName = qs("teamName");
const btnCreate = qs("btnCreate");
const teamsList = qs("teamsList");

let teams = loadTeams();
let assessments = loadAllAssessments();

function countEngineers(teamId) {
  return assessments.filter(a => a.engineer?.teamId === teamId).length;
}

function render() {
  teams = loadTeams();
  assessments = loadAllAssessments();

  teamsList.innerHTML = "";
  if (!teams.length) {
    teamsList.innerHTML = `<div class="text-sm text-white/60">No teams yet.</div>`;
    return;
  }

  teams.forEach(t => {
    const row = document.createElement("div");
    row.className = "card p-4 flex items-start justify-between gap-3";

    const left = document.createElement("div");
    left.innerHTML = `<div class="text-sm font-extrabold">${t.name}</div>
      <div class="text-xs text-white/60 mt-1">${countEngineers(t.id)} engineers</div>`;

    const actions = document.createElement("div");
    actions.className = "flex gap-2 flex-wrap";

    const rename = document.createElement("button");
    rename.className = "btn";
    rename.textContent = "Rename";
    rename.onclick = () => {
      const nn = prompt("New team name:", t.name);
      if (!nn) return;
      teams = teams.map(x => x.id === t.id ? { ...x, name: nn } : x);
      saveTeams(teams);
      render();
    };

    const del = document.createElement("button");
    del.className = "btn-danger";
    del.textContent = "Delete";
    del.onclick = () => {
      const n = countEngineers(t.id);
      const ok = confirm(`Delete team "${t.name}"? It has ${n} engineers.`);
      if (!ok) return;

      const deleteAll = confirm("Also delete ALL engineers (assessments) in this team?\nOK = delete engineers too\nCancel = unassign engineers only");
      if (deleteAll) {
        // delete assessments in team
        const ids = assessments.filter(a => a.engineer?.teamId === t.id).map(a => a.id);
        let next = assessments;
        ids.forEach(id => next = removeById(next, id));
        saveAllAssessments(next);
      } else {
        // unassign engineers
        const next = assessments.map(a => (a.engineer?.teamId === t.id ? { ...a, engineer: { ...a.engineer, teamId: "" } } : a));
        saveAllAssessments(next);
      }

      // remove team
      teams = teams.filter(x => x.id !== t.id);
      saveTeams(teams);
      render();
    };

    actions.appendChild(rename);
    actions.appendChild(del);

    row.appendChild(left);
    row.appendChild(actions);
    teamsList.appendChild(row);
  });
}

btnCreate.onclick = () => {
  const name = teamName.value.trim();
  if (!name) return;
  const t = { id: crypto?.randomUUID?.() ?? String(Date.now()), name, createdAt: new Date().toISOString() };
  teams = [t, ...teams];
  saveTeams(teams);
  teamName.value = "";
  render();
};

render();
