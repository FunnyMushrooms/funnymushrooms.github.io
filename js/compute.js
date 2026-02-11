import { AXES } from "./questions.js";

const clamp10 = (v) => Math.max(1, Math.min(10, Number(v) || 1));
const avg = (arr) => (arr.length ? arr.reduce((a,b)=>a+b,0) / arr.length : 0);
const round1 = (n) => Math.round((n + Number.EPSILON) * 10) / 10;

export function makeBlankAssessment() {
  const id = crypto?.randomUUID?.() ?? String(Date.now());
  const answers = {};
  for (const axis of AXES) for (const q of axis.questions) answers[q.id] = 5;

  return {
    version: 1,
    id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    engineer: { name:"", role:"", period:"", mainDirection:"Scenarios / Iron Range", additionalDirection:[], domains:[] },
    notes: "",
    answers,
  };
}

export function compute(assessment) {
  const answers = assessment.answers || {};
  const axisOverall = AXES.map(axis => {
    const vals = axis.questions.map(q => clamp10(answers[q.id]));
    const total = vals.reduce((a,b)=>a+b,0);
    const mean = total / axis.questions.length;

    const byTag = {};
    for (const q of axis.questions) {
      const v = clamp10(answers[q.id]);
      (byTag[q.tag] ||= []).push(v);
    }
    const tagAverages = Object.fromEntries(Object.entries(byTag).map(([t,vs]) => [t, round1(avg(vs))]));

    return { axisId: axis.id, label: axis.name, total, mean: round1(mean), tagAverages };
  });

  const labels = AXES.map(a => a.name);

  // datasets for radar; leader-only tags will be null on other axes
  const overall = axisOverall.map(a => a.mean);

  const scenario = axisOverall.map(a => a.tagAverages.S ?? null);
  const soc = axisOverall.map(a => a.tagAverages.SOC ?? null);
  const pt = axisOverall.map(a => a.tagAverages.PT ?? null);

  const team = axisOverall.map(a => a.tagAverages.TEAM ?? null);
  const comms = axisOverall.map(a => a.tagAverages.COMMS ?? null);
  const en = axisOverall.map(a => a.tagAverages.EN ?? null);

  const allVals = Object.values(answers).map(clamp10);
  const overallMean = round1(avg(allVals));

  return { axisOverall, labels, series: { overall, scenario, soc, pt, team, comms, en }, overallMean };
}
