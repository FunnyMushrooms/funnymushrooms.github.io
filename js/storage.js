const STORAGE_KEY = "cyber_survey_assessments_v1";
const CURRENT_KEY = "cyber_survey_current_id_v1";

export function loadAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveAll(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
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
