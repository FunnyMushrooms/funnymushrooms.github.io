import { AXES } from "./questions.js";

const clamp10 = (v) => Math.max(1, Math.min(10, Number(v) || 1));
const avg = (arr) => (arr.length ? arr.reduce((a,b)=>a+b,0) / arr.length : null);
const round1 = (n) => (n == null ? null : Math.round((n + Number.EPSILON) * 10) / 10);

export function makeBlankAssessment() {
  const id = crypto?.randomUUID?.() ?? String(Date.now());
  const answers = {};
  for (const axis of AXES) for (const q of axis.questions) answers[q.id] = 5;

  return {
    version: 2,
    id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    engineer: { name:"", role:"", period:"", teamId:"", mainDirection:"Scenarios / Iron Range", additionalDirection:[], domains:[] },
    notes: "",
    answers,
  };
}

function normTotal(mean) {
  // Normalize axis total to /100 even if some questions are N/A.
  // mean is 1..10; totalNormalized = mean*10.
  return mean == null ? null : Math.round(mean * 10);
}

export function compute(assessment) {
  const answers = assessment.answers || {};

  const axisOverall = AXES.map(axis => {
    const vals = axis.questions
      .map(q => {
        const v = answers[q.id];
        if (v === null || v === undefined) return null;
        return clamp10(v);
      });

    const answered = vals.filter(v => v != null);
    const mean = avg(answered);
    const meanR = round1(mean);

    const byTag = {};
    axis.questions.forEach((q, i) => {
      const v = vals[i];
      if (v == null) return;
      (byTag[q.tag] ||= []).push(v);
    });

    const tagAverages = Object.fromEntries(
      Object.entries(byTag).map(([t,vs]) => [t, round1(avg(vs))])
    );

    return {
      axisId: axis.id,
      label: axis.name,
      answeredCount: answered.length,
      mean: meanR,                          // 1..10 or null
      total: normTotal(meanR),              // /100 normalized or null
      tagAverages,
    };
  });

  const labels = AXES.map(a => a.name);

  const series = {
    overall: axisOverall.map(a => a.mean),
    scenario: axisOverall.map(a => a.tagAverages.S ?? null),
    soc: axisOverall.map(a => a.tagAverages.SOC ?? null),
    pt: axisOverall.map(a => a.tagAverages.PT ?? null),
    team: axisOverall.map(a => a.tagAverages.TEAM ?? null),
    comms: axisOverall.map(a => a.tagAverages.COMMS ?? null),
    en: axisOverall.map(a => a.tagAverages.EN ?? null),
  };

  const allAnswered = Object.values(answers)
    .map(v => (v == null ? null : clamp10(v)))
    .filter(v => v != null);

  const overallMean = round1(avg(allAnswered));

  return { axisOverall, labels, series, overallMean };
}
