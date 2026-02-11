export function el(tag, cls, html) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html !== undefined) n.innerHTML = html;
  return n;
}

export function tagClass(tag) {
  return `tag tag-${tag}`;
}

export function btnToggle(label, active) {
  const b = el("button", active ? "btn-primary" : "btn", label);
  b.dataset.active = active ? "1" : "0";
  return b;
}

export function downloadJson(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
