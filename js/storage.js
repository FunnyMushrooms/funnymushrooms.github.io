const ASSESS_KEY = "cyber_survey_assessments_v2";
const TEAMS_KEY = "cyber_survey_teams_v1";
const CURRENT_KEY = "cyber_survey_current_id_v2";

export function loadAllAssessments() {
  try {
    const raw = localStorage.getItem(ASSESS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

export function saveAllAssessments(list) {
  localStorage.setItem(ASSESS_KEY, JSON.stringify(list));
}

export function loadTeams() {
  try {
    const raw = localStorage.getItem(TEAMS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

export function saveTeams(list) {
  localStorage.setItem(TEAMS_KEY, JSON.stringify(list));
}

export function getCurrentId() {
  return localStorage.getItem(CURRENT_KEY) || "";
}

export function setCurrentId(id) {
  localStorage.setItem(CURRENT_KEY, id);
}

export function upsert(list, item) {
  const filtered = list.filter(x => x.id !== item.id);
  return [item, ...filtered];
}

export function removeById(list, id) {
  return list.filter(x => x.id !== id);
}

export function exportBackupPayload() {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    teams: loadTeams(),
    assessments: loadAllAssessments(),
  };
}

export function importBackupPayload(payload) {
  const teams = Array.isArray(payload?.teams) ? payload.teams : [];
  const assessments = Array.isArray(payload?.assessments) ? payload.assessments : [];
  saveTeams(teams);
  saveAllAssessments(assessments);
}
