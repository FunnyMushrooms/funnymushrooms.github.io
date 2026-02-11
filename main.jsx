import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toPng } from "html-to-image";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

// --- Schema ---------------------------------------------------------------
// Axes are NOT split. Questions inside each axis are tagged by process slice.
// Tags are used for slice breakdown + overlays.
const AXES = [
  {
    id: "windows",
    name: "Windows Systems",
    subtitle: "incl. AD",
    questions: [
      { id: "win_q1", tag: "S", text: "Familiarity with building stable, reproducible Windows lab hosts for scenarios (setup + reset-ready)." },
      { id: "win_q2", tag: "S", text: "Familiarity with AD lab construction (domain setup, OUs, users/groups/service accounts) to match scenario needs." },
      { id: "win_q3", tag: "S", text: "Ability to configure permissions/access paths (shares, local rights, group membership, service permissions) to support scenario logic." },
      { id: "win_q4", tag: "S", text: "Familiarity with Windows policy configuration (baseline settings / GPO concepts) to enforce scenario conditions reliably." },
      { id: "win_q5", tag: "SOC", text: "Familiarity with Windows investigation telemetry (what sources exist and what each is useful for in an incident)." },
      { id: "win_q6", tag: "SOC", text: "Ability to interpret authentication/account activity in Windows/AD (normal vs suspicious behavior patterns)." },
      { id: "win_q7", tag: "SOC", text: "Ability to do Windows incident triage and containment (what to check first; safe actions like isolate/disable/reset)." },
      { id: "win_q8", tag: "PT", text: "Depth of understanding of Windows/AD authentication mechanics (why credential attacks work conceptually)." },
      { id: "win_q9", tag: "PT", text: "Depth of understanding of privilege boundaries and escalation surfaces in Windows environments (common misconfigs/abuse paths)." },
      { id: "win_q10", tag: "PT", text: "Depth of understanding of AD attack paths and defensive features (trust/delegation concepts, tiering/admin separation, certificate/PKI concepts)." },
    ],
  },
  {
    id: "linux",
    name: "Linux Systems",
    subtitle: "admin + hardening",
    questions: [
      { id: "lin_q1", tag: "S", text: "Ability to build reproducible Linux hosts for scenarios (services installed, configs, reset-ready state)." },
      { id: "lin_q2", tag: "S", text: "Familiarity with Linux users/permissions for scenario design (service accounts, sudo rules, file permissions)." },
      { id: "lin_q3", tag: "S", text: "Ability to configure Linux services needed by scenarios (web, db, agents, schedulers) predictably." },
      { id: "lin_q4", tag: "S", text: "Ability to prepare Linux-based scenario artifacts (data, logs, configs) so tasks behave consistently." },
      { id: "lin_q5", tag: "SOC", text: "Familiarity with Linux telemetry/log sources for investigations (what exists, what it indicates)." },
      { id: "lin_q6", tag: "SOC", text: "Ability to reason about Linux access and execution (logins, sudo usage, suspicious processes/persistence patterns)." },
      { id: "lin_q7", tag: "SOC", text: "Ability to perform Linux triage/containment safely (what to collect, what to change, what to isolate)." },
      { id: "lin_q8", tag: "PT", text: "Depth of understanding of Linux privilege escalation concepts (why misconfigs lead to root, common categories)." },
      { id: "lin_q9", tag: "PT", text: "Depth of understanding of Linux hardening and attack surface (what settings matter, typical gaps attackers use)." },
      { id: "lin_q10", tag: "PT", text: "Depth of understanding of Linux lateral movement/exfil paths (SSH keys, creds, service exposure concepts)." },
    ],
  },
  {
    id: "network",
    name: "Networking",
    subtitle: "arch / mgmt / security",
    questions: [
      { id: "net_q1", tag: "S", text: "Ability to design scenario network topology (segments, routing/NAT concepts, controlled connectivity) that supports the story." },
      { id: "net_q2", tag: "S", text: "Familiarity with core network services used in scenarios (DNS/DHCP/time sync concepts and why they matter)." },
      { id: "net_q3", tag: "S", text: "Ability to implement segmentation and access rules (firewall policy intent, allowed flows) for scenario objectives." },
      { id: "net_q4", tag: "S", text: "Ability to prepare network artifacts for scenarios (diagrams, intended flows, documented access paths)." },
      { id: "net_q5", tag: "SOC", text: "Familiarity with network security data sources (flow, firewall, proxy, DNS logs—conceptually)." },
      { id: "net_q6", tag: "SOC", text: "Ability to recognize common suspicious network patterns at a conceptual level (scanning, brute force, beaconing, exfil indicators)." },
      { id: "net_q7", tag: "SOC", text: "Ability to support incident work via network reasoning (scope, affected segments, containment options like blocking/isolation)." },
      { id: "net_q8", tag: "PT", text: "Depth of understanding of network attack paths (pivoting, segmentation-bypass categories, trust assumptions)." },
      { id: "net_q9", tag: "PT", text: "Depth of understanding of typical network misconfig risks (over-permissive rules, exposed management, weak remote access patterns)." },
      { id: "net_q10", tag: "PT", text: "Depth of understanding of secure network design principles (least privilege connectivity, defense-in-depth, monitoring placement concepts)." },
    ],
  },
  {
    id: "apps",
    name: "Applications",
    subtitle: "web/mobile/dev/reverse",
    questions: [
      { id: "app_q1", tag: "S", text: "Ability to deploy/configure application stacks for scenarios (web/API/db dependencies) in a stable, repeatable way." },
      { id: "app_q2", tag: "S", text: "Ability to implement scenario-relevant auth/session configuration (accounts/roles/tokens) so tasks are consistent." },
      { id: "app_q3", tag: "S", text: "Ability to prepare application artifacts and data for scenarios (seed data, logs, configs, predictable states)." },
      { id: "app_q4", tag: "S", text: "Ability to build/adapt intentionally vulnerable app conditions safely for training (controlled scope, no chaos)." },
      { id: "app_q5", tag: "SOC", text: "Familiarity with application investigation signals (app logs, auth logs, API access logs—what they reveal)." },
      { id: "app_q6", tag: "SOC", text: "Ability to reason about auth/session abuse in incidents (token misuse patterns, suspicious access behavior concepts)." },
      { id: "app_q7", tag: "SOC", text: "Ability to support IR with app-level containment thinking (rotate secrets, disable endpoints, reduce exposure conceptually)." },
      { id: "app_q8", tag: "PT", text: "Depth of understanding of common web/API vulnerability classes (categories and why they happen; not tool steps)." },
      { id: "app_q9", tag: "PT", text: "Depth of understanding of secure application design basics (authz boundaries, secrets handling, logging principles)." },
      { id: "app_q10", tag: "PT", text: "Mobile/reverse security concepts when needed (where secrets end up, common abuse categories, high-level reasoning)." },
    ],
  },
  {
    id: "automation",
    name: "Automation Tools",
    subtitle: "programming + IaC",
    questions: [
      { id: "aut_q1", tag: "S", text: "Ability to automate scenario deployment/config (repeatable setup, idempotent approach, fewer manual steps)." },
      { id: "aut_q2", tag: "S", text: "Familiarity with configuration management concepts/tools (Ansible-like thinking) for consistent lab state." },
      { id: "aut_q3", tag: "S", text: "Familiarity with infrastructure-as-code concepts/tools (Terraform-like thinking) for reproducible environments." },
      { id: "aut_q4", tag: "S", text: "Ability to manage versioning and rollback of automation/config changes (controlled releases, stability mindset)." },
      { id: "aut_q5", tag: "SOC", text: "Ability to automate evidence collection/normalization for investigations (repeatable triage data gathering)." },
      { id: "aut_q6", tag: "SOC", text: "Ability to integrate automation into workflows (alerts/enrichment/tickets) with reliability and safety." },
      { id: "aut_q7", tag: "SOC", text: "Maturity in handling secrets safely in automation (no hardcoding, access control, rotation mindset)." },
      { id: "aut_q8", tag: "PT", text: "Ability to automate verification/reproduction of findings responsibly (controlled scripts, clear evidence)." },
      { id: "aut_q9", tag: "PT", text: "Understanding of how automation introduces risk (over-privileged tokens, supply chain, unsafe defaults) and mitigation." },
      { id: "aut_q10", tag: "PT", text: "Overall engineering quality of scripts/tools (readability, error handling, docs, maintainability)." },
    ],
  },
  {
    id: "leader",
    name: "Leader",
    subtitle: "teamwork + comms + English",
    questions: [
      { id: "lead_q1", tag: "TEAM", text: "Ownership: takes tasks end-to-end; closes loops; does not disappear after handoff." },
      { id: "lead_q2", tag: "TEAM", text: "Works predictably in a team process (planning, updates, delivery discipline)." },
      { id: "lead_q3", tag: "TEAM", text: "Collaborates across functions (scenarios/infra/SOC/PT) without friction." },
      { id: "lead_q4", tag: "TEAM", text: "Initiative: proposes improvements, identifies risks early, acts without being pushed." },
      { id: "lead_q5", tag: "TEAM", text: "Mentoring/helpfulness: supports teammates, reviews, shares knowledge." },
      { id: "lead_q6", tag: "TEAM", text: "Professional under stress: prioritization, calm comms, consistency." },
      { id: "lead_q7", tag: "COMMS", text: "Written clarity: tickets, docs, runbooks, scenario notes are understandable." },
      { id: "lead_q8", tag: "COMMS", text: "Verbal clarity: explains decisions and status in meetings/hand-offs." },
      { id: "lead_q9", tag: "EN", text: "English reading: can consume vendor docs/advisories/guides without constant translation." },
      { id: "lead_q10", tag: "EN", text: "English writing/speaking: can write reports/messages and participate in calls at a work-usable level." },
    ],
  },
].filter((a) => ["windows", "linux", "network", "apps", "automation", "leader"].includes(a.id));

const TAG_META = {
  S: { label: "Scenario", chip: "S" },
  SOC: { label: "SOC", chip: "SOC" },
  PT: { label: "Pentest", chip: "PT" },
  TEAM: { label: "Team", chip: "TEAM" },
  COMMS: { label: "Comms", chip: "COMMS" },
  EN: { label: "English", chip: "EN" },
};

// --- Helpers --------------------------------------------------------------
const clamp10 = (v) => Math.max(1, Math.min(10, Number(v) || 1));
const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

function makeBlankAssessment() {
  const id = crypto?.randomUUID?.() ?? String(Date.now());
  const answers = {};
  for (const axis of AXES) for (const q of axis.questions) answers[q.id] = 5;
  return {
    version: 1,
    id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    engineer: {
      name: "",
      role: "",
      period: "",
      mainDirection: "Scenarios / Iron Range",
      additionalDirection: [],
      domains: [],
    },
    notes: "",
    answers,
  };
}

function compute(assessment) {
  const { answers } = assessment;

  const axisOverall = AXES.map((axis) => {
    const qs = axis.questions.map((q) => clamp10(answers[q.id]));
    const total = qs.reduce((a, b) => a + b, 0);
    const mean = total / axis.questions.length; // 1..10

    // Slice breakdown (Scenario/SOC/PT for technical axes; TEAM/COMMS/EN for Leader)
    const byTag = {};
    for (const q of axis.questions) {
      const v = clamp10(answers[q.id]);
      byTag[q.tag] = byTag[q.tag] || [];
      byTag[q.tag].push(v);
    }
    const tagAverages = Object.fromEntries(Object.entries(byTag).map(([t, vs]) => [t, avg(vs)]));

    return {
      axisId: axis.id,
      label: axis.name,
      mean,
      total,
      tagAverages,
    };
  });

  // Radar dataset (overall + process overlays)
  const base = AXES.map((a) => ({ key: a.id, axis: a.name }));
  const byAxisId = Object.fromEntries(axisOverall.map((x) => [x.axisId, x]));

  const radarData = base.map((row) => {
    const ax = byAxisId[row.key];
    const out = { axis: row.axis, Overall: round1(ax.mean) };

    // If axis has S/SOC/PT tags, expose them for overlays.
    if (ax.tagAverages.S !== undefined) out.Scenario = round1(ax.tagAverages.S);
    if (ax.tagAverages.SOC !== undefined) out.SOC = round1(ax.tagAverages.SOC);
    if (ax.tagAverages.PT !== undefined) out.Pentest = round1(ax.tagAverages.PT);

    // Leader overlays
    if (ax.tagAverages.TEAM !== undefined) out.Team = round1(ax.tagAverages.TEAM);
    if (ax.tagAverages.COMMS !== undefined) out.Comms = round1(ax.tagAverages.COMMS);
    if (ax.tagAverages.EN !== undefined) out.English = round1(ax.tagAverages.EN);

    return out;
  });

  // Global summary
  const allVals = Object.values(answers).map(clamp10);
  const overallMean = avg(allVals);
  return {
    axisOverall,
    radarData,
    overallMean: round1(overallMean),
  };
}

function round1(n) {
  return Math.round((n + Number.EPSILON) * 10) / 10;
}

function downloadText(filename, text, mime = "application/json") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// --- UI components --------------------------------------------------------
function Pill({ children, variant = "neutral" }) {
  const base =
    "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold tracking-wide border";
  const map = {
    neutral: "border-white/10 bg-white/5 text-white/80",
    S: "border-blue-400/30 bg-blue-500/10 text-blue-200",
    SOC: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
    PT: "border-rose-400/30 bg-rose-500/10 text-rose-200",
    TEAM: "border-violet-400/30 bg-violet-500/10 text-violet-200",
    COMMS: "border-amber-400/30 bg-amber-500/10 text-amber-200",
    EN: "border-cyan-400/30 bg-cyan-500/10 text-cyan-200",
  };
  return <span className={`${base} ${map[variant] || map.neutral}`}>{children}</span>;
}

function SectionCard({ title, subtitle, right, children }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
      <div className="flex items-start justify-between gap-4 p-5 border-b border-white/10">
        <div>
          <div className="text-lg font-bold text-white">{title}</div>
          {subtitle ? <div className="text-sm text-white/60 mt-1">{subtitle}</div> : null}
        </div>
        {right}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Slider10({ value, onChange }) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={1}
        max={10}
        value={value}
        onChange={(e) => onChange(clamp10(e.target.value))}
        className="w-full accent-white"
      />
      <div className="w-10 text-right font-bold tabular-nums text-white">{value}</div>
    </div>
  );
}

function AppHeader({ mode, setMode, activeId, setActiveId, savedAt, onNew, onExport, onImport, onDownloadChart }) {
  return (
    <div className="sticky top-0 z-30 backdrop-blur-xl bg-[#07070a]/70 border-b border-white/10">
      <div className="mx-auto max-w-7xl px-4 py-4 flex items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#0C5394] via-[#990001] to-[#5B0F00] shadow-lg" />
          <div>
            <div className="text-white font-extrabold leading-tight">Cyber Skills Survey</div>
            <div className="text-xs text-white/60">TeamLead → Engineer radar • dark mode</div>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setMode("survey")}
            className={`px-3 py-2 rounded-xl text-sm font-semibold border ${
              mode === "survey" ? "border-white/20 bg-white/10 text-white" : "border-white/10 bg-white/[0.03] text-white/70 hover:text-white"
            }`}
          >
            Survey
          </button>
          <button
            onClick={() => setMode("report")}
            className={`px-3 py-2 rounded-xl text-sm font-semibold border ${
              mode === "report" ? "border-white/20 bg-white/10 text-white" : "border-white/10 bg-white/[0.03] text-white/70 hover:text-white"
            }`}
          >
            Report
          </button>

          <div className="h-6 w-px bg-white/10 mx-1" />

          <button
            onClick={onNew}
            className="px-3 py-2 rounded-xl text-sm font-semibold border border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/10 hover:text-white"
          >
            New
          </button>
          <button
            onClick={onExport}
            className="px-3 py-2 rounded-xl text-sm font-semibold border border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/10 hover:text-white"
          >
            Export JSON
          </button>
          <label className="px-3 py-2 rounded-xl text-sm font-semibold border border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/10 hover:text-white cursor-pointer">
            Import JSON
            <input type="file" accept="application/json" className="hidden" onChange={onImport} />
          </label>
          <button
            onClick={onDownloadChart}
            className="px-3 py-2 rounded-xl text-sm font-semibold border border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/10 hover:text-white"
          >
            Download PNG
          </button>

          <div className="hidden md:flex items-center gap-2 ml-2">
            <Pill variant="neutral">Saved {savedAt}</Pill>
            <Pill variant="neutral">Axis: {AXES.find((a) => a.id === activeId)?.name}</Pill>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {AXES.map((a) => (
            <button
              key={a.id}
              onClick={() => setActiveId(a.id)}
              className={`shrink-0 rounded-xl border px-3 py-2 text-sm font-semibold ${
                activeId === a.id ? "border-white/20 bg-white/10 text-white" : "border-white/10 bg-white/[0.03] text-white/70 hover:text-white"
              }`}
            >
              {a.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function AxisQuestions({ axis, answers, setAnswer }) {
  return (
    <SectionCard
      title={`${axis.name}`}
      subtitle={`10 questions • tags inside reveal Scenario/SOC/Pentest strengths`}
      right={<Pill variant="neutral">Max 100</Pill>}
    >
      <div className="space-y-4">
        {axis.questions.map((q, idx) => (
          <div key={q.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Pill variant={q.tag}>{q.tag}</Pill>
                  <div className="text-sm font-bold text-white/90">Q{idx + 1}</div>
                </div>
                <div className="text-sm text-white/80 leading-relaxed">{q.text}</div>
              </div>
              <div className="w-56 max-w-[40%]">
                <Slider10 value={clamp10(answers[q.id])} onChange={(v) => setAnswer(q.id, v)} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function ProfileCard({ engineer, setEngineer, notes, setNotes }) {
  const mainOptions = ["Scenarios / Iron Range", "Scenarios", "Scenarios Transferring", "SOC", "Pentest"];
  const additionalOptions = ["SOC", "Pentest", "Iron Range", "CTF", "Marketing", "Communication"];
  const domainOptions = [
    "Leadership in Cybersecurity",
    "Security Operations (SOC)",
    "SIEM",
    "Security Automation",
    "Digital Forensics",
    "PenTest",
    "CTF / Education",
    "Network Architecture",
    "Network Management",
    "Network Security",
    "Virtualization / Infrastructure",
    "Windows / AD",
    "Linux",
    "Cloud Security",
    "AI",
    "OT/ICS / PLC",
  ];

  const toggle = (key, value) => {
    setEngineer((prev) => {
      const set = new Set(prev[key]);
      if (set.has(value)) set.delete(value);
      else set.add(value);
      return { ...prev, [key]: Array.from(set) };
    });
  };

  return (
    <SectionCard
      title="Engineer Profile"
      subtitle="Filled by TeamLead • one submission per engineer"
      right={<Pill variant="neutral">Autosaves locally</Pill>}
    >
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <label className="block">
            <div className="text-xs text-white/60 mb-1">Engineer name</div>
            <input
              value={engineer.name}
              onChange={(e) => setEngineer((p) => ({ ...p, name: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/10"
              placeholder="e.g., Ivan Petrenko"
            />
          </label>
          <label className="block">
            <div className="text-xs text-white/60 mb-1">Role</div>
            <input
              value={engineer.role}
              onChange={(e) => setEngineer((p) => ({ ...p, role: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/10"
              placeholder="e.g., Scenario Engineer / SOC / PT / Mixed"
            />
          </label>
          <label className="block">
            <div className="text-xs text-white/60 mb-1">Evaluation period</div>
            <input
              value={engineer.period}
              onChange={(e) => setEngineer((p) => ({ ...p, period: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/10"
              placeholder="e.g., 2026-02 (last 6 weeks)"
            />
          </label>
        </div>

        <div className="space-y-3">
          <div>
            <div className="text-xs text-white/60 mb-2">Main direction</div>
            <div className="flex flex-wrap gap-2">
              {mainOptions.map((v) => (
                <button
                  key={v}
                  onClick={() => setEngineer((p) => ({ ...p, mainDirection: v }))}
                  className={`px-3 py-2 rounded-xl text-sm font-semibold border ${
                    engineer.mainDirection === v ? "border-white/20 bg-white/10 text-white" : "border-white/10 bg-white/[0.03] text-white/70 hover:text-white"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs text-white/60 mb-2">Additional direction</div>
            <div className="flex flex-wrap gap-2">
              {additionalOptions.map((v) => (
                <button
                  key={v}
                  onClick={() => toggle("additionalDirection", v)}
                  className={`px-3 py-2 rounded-xl text-sm font-semibold border ${
                    engineer.additionalDirection.includes(v)
                      ? "border-white/20 bg-white/10 text-white"
                      : "border-white/10 bg-white/[0.03] text-white/70 hover:text-white"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <div className="text-xs text-white/60 mb-2">Domains touched</div>
        <div className="flex flex-wrap gap-2">
          {domainOptions.map((v) => (
            <button
              key={v}
              onClick={() => toggle("domains", v)}
              className={`px-3 py-2 rounded-xl text-sm font-semibold border ${
                engineer.domains.includes(v)
                  ? "border-white/20 bg-white/10 text-white"
                  : "border-white/10 bg-white/[0.03] text-white/70 hover:text-white"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <div className="text-xs text-white/60 mb-2">TeamLead notes (optional)</div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full min-h-[92px] rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/10"
          placeholder="Evidence, examples, context…"
        />
      </div>
    </SectionCard>
  );
}

function ReportView({ assessment, setAssessment }) {
  const chartRef = useRef(null);
  const computed = useMemo(() => compute(assessment), [assessment]);

  const axisTable = computed.axisOverall.map((a) => {
    const row = {
      Axis: a.label,
      Overall: `${round1(a.mean)}/10`,
      Total: `${Math.round(a.total)}/100`,
    };
    // include tag averages (only those that exist for the axis)
    for (const t of Object.keys(a.tagAverages)) row[t] = `${round1(a.tagAverages[t])}/10`;
    return row;
  });

  const overlays = useMemo(() => {
    // Determine which series exist in radar data.
    const sample = computed.radarData[0] || {};
    const candidates = ["Overall", "Scenario", "SOC", "Pentest", "Team", "Comms", "English"];
    return candidates.filter((k) => sample[k] !== undefined);
  }, [computed.radarData]);

  const [enabled, setEnabled] = useState(() => new Set(["Overall", "Scenario", "SOC", "Pentest"]));
  useEffect(() => {
    // keep enabled sane when importing leader-only etc
    setEnabled((prev) => {
      const next = new Set(Array.from(prev).filter((k) => overlays.includes(k)));
      if (!next.size) next.add("Overall");
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlays.join("|")]);

  const toggle = (k) => setEnabled((prev) => {
    const n = new Set(prev);
    if (n.has(k)) n.delete(k);
    else n.add(k);
    if (!n.size) n.add("Overall");
    return n;
  });

  const downloadChart = async () => {
    if (!chartRef.current) return;
    const png = await toPng(chartRef.current, { pixelRatio: 2, backgroundColor: "#07070a" });
    const a = document.createElement("a");
    a.href = png;
    a.download = `${(assessment.engineer.name || "engineer").replace(/\s+/g, "_")}_radar.png`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <SectionCard
        title="Radar & Summary"
        subtitle={`Overall mean: ${computed.overallMean}/10 • Downloadable as PNG`}
        right={
          <button
            onClick={downloadChart}
            className="px-3 py-2 rounded-xl text-sm font-semibold border border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/10 hover:text-white"
          >
            Download chart PNG
          </button>
        }
      >
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <div ref={chartRef} className="rounded-2xl border border-white/10 bg-black/30 p-3">
              <div className="h-[360px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={computed.radarData} outerRadius="78%">
                    <PolarGrid stroke="rgba(255,255,255,0.12)" />
                    <PolarAngleAxis dataKey="axis" tick={{ fill: "rgba(255,255,255,0.75)", fontSize: 12 }} />
                    <PolarRadiusAxis domain={[0, 10]} tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 10 }} stroke="rgba(255,255,255,0.12)" />
                    <Tooltip contentStyle={{ background: "#0b0b10", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12 }} labelStyle={{ color: "rgba(255,255,255,0.8)" }} />
                    {enabled.has("Overall") && (
                      <Radar name="Overall" dataKey="Overall" stroke="rgba(255,255,255,0.9)" fill="rgba(255,255,255,0.18)" strokeWidth={2} />
                    )}
                    {enabled.has("Scenario") && (
                      <Radar name="Scenario" dataKey="Scenario" stroke="rgba(96,165,250,0.95)" fill="rgba(96,165,250,0.12)" strokeWidth={2} />
                    )}
                    {enabled.has("SOC") && (
                      <Radar name="SOC" dataKey="SOC" stroke="rgba(52,211,153,0.95)" fill="rgba(52,211,153,0.10)" strokeWidth={2} />
                    )}
                    {enabled.has("Pentest") && (
                      <Radar name="Pentest" dataKey="Pentest" stroke="rgba(244,63,94,0.95)" fill="rgba(244,63,94,0.10)" strokeWidth={2} />
                    )}
                    {enabled.has("Team") && (
                      <Radar name="Team" dataKey="Team" stroke="rgba(167,139,250,0.95)" fill="rgba(167,139,250,0.10)" strokeWidth={2} />
                    )}
                    {enabled.has("Comms") && (
                      <Radar name="Comms" dataKey="Comms" stroke="rgba(251,191,36,0.95)" fill="rgba(251,191,36,0.10)" strokeWidth={2} />
                    )}
                    {enabled.has("English") && (
                      <Radar name="English" dataKey="English" stroke="rgba(34,211,238,0.95)" fill="rgba(34,211,238,0.10)" strokeWidth={2} />
                    )}
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-sm font-bold text-white">Overlays</div>
            <div className="flex flex-wrap gap-2">
              {overlays.map((k) => (
                <button
                  key={k}
                  onClick={() => toggle(k)}
                  className={`px-3 py-2 rounded-xl text-sm font-semibold border ${
                    enabled.has(k) ? "border-white/20 bg-white/10 text-white" : "border-white/10 bg-white/[0.03] text-white/70 hover:text-white"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <div className="text-xs text-white/60">Engineer</div>
              <div className="text-lg font-extrabold text-white mt-1">{assessment.engineer.name || "(name not set)"}</div>
              <div className="text-sm text-white/70 mt-1">{assessment.engineer.role || "—"}</div>
              <div className="mt-3 text-xs text-white/60">Main direction</div>
              <div className="text-sm text-white/80">{assessment.engineer.mainDirection || "—"}</div>
              <div className="mt-3 text-xs text-white/60">Period</div>
              <div className="text-sm text-white/80">{assessment.engineer.period || "—"}</div>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Axis breakdown" subtitle="Totals + tag averages (hidden slices inside each axis)">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-white/60">
                {Object.keys(axisTable[0] || { Axis: "", Overall: "", Total: "" }).map((h) => (
                  <th key={h} className="text-left font-semibold py-2 pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {axisTable.map((r, i) => (
                <tr key={i} className="border-t border-white/10">
                  {Object.values(r).map((v, j) => (
                    <td key={j} className="py-2 pr-4 text-white/85">{String(v)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Edit scores" subtitle="You can adjust marks here after import/export">
        <div className="space-y-4">
          {AXES.map((axis) => (
            <details key={axis.id} className="rounded-2xl border border-white/10 bg-white/[0.02]">
              <summary className="cursor-pointer select-none px-4 py-3 text-white font-bold">{axis.name}</summary>
              <div className="p-4 pt-0 space-y-3">
                {axis.questions.map((q, idx) => (
                  <div key={q.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Pill variant={q.tag}>{q.tag}</Pill>
                          <div className="text-sm font-bold text-white/90">Q{idx + 1}</div>
                        </div>
                        <div className="text-sm text-white/80 leading-relaxed">{q.text}</div>
                      </div>
                      <div className="w-56 max-w-[40%]">
                        <Slider10
                          value={clamp10(assessment.answers[q.id])}
                          onChange={(v) =>
                            setAssessment((p) => ({
                              ...p,
                              updatedAt: new Date().toISOString(),
                              answers: { ...p.answers, [q.id]: v },
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

// --- Main App -------------------------------------------------------------
export default function App() {
  const STORAGE_KEY = "cyber_survey_assessments_v1";
  const CURRENT_KEY = "cyber_survey_current_id_v1";

  const [assessments, setAssessments] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [currentId, setCurrentId] = useState(() => {
    return localStorage.getItem(CURRENT_KEY) || "";
  });

  const [mode, setMode] = useState("survey");
  const [activeAxisId, setActiveAxisId] = useState("windows");
  const [savedAt, setSavedAt] = useState("just now");

  const current = useMemo(() => {
    const found = assessments.find((a) => a.id === currentId);
    if (found) return found;
    // If none, create one.
    return null;
  }, [assessments, currentId]);

  useEffect(() => {
    if (!current) {
      const fresh = makeBlankAssessment();
      setAssessments((prev) => [fresh, ...prev]);
      setCurrentId(fresh.id);
      localStorage.setItem(CURRENT_KEY, fresh.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  // Persist
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(assessments));
      if (currentId) localStorage.setItem(CURRENT_KEY, currentId);
      setSavedAt(new Date().toLocaleTimeString());
    } catch {
      // ignore
    }
  }, [assessments, currentId]);

  const setCurrent = (updater) => {
    setAssessments((prev) =>
      prev.map((a) => {
        if (a.id !== currentId) return a;
        const next = typeof updater === "function" ? updater(a) : updater;
        return next;
      })
    );
  };

  const axis = useMemo(() => AXES.find((a) => a.id === activeAxisId) || AXES[0], [activeAxisId]);

  const chartRefForHeader = useRef(null);
  const downloadChartFromHeader = async () => {
    if (!current) return;
    const node = chartRefForHeader.current;
    if (!node) {
      // If not in report mode, switch and let user click again.
      setMode("report");
      return;
    }
    const png = await toPng(node, { pixelRatio: 2, backgroundColor: "#07070a" });
    const a = document.createElement("a");
    a.href = png;
    a.download = `${(current.engineer.name || "engineer").replace(/\s+/g, "_")}_radar.png`;
    a.click();
  };

  const exportJSON = () => {
    if (!current) return;
    const computed = compute(current);
    const payload = {
      ...current,
      computed,
      schema: {
        axes: AXES.map((ax) => ({
          id: ax.id,
          name: ax.name,
          questions: ax.questions.map((q) => ({ id: q.id, tag: q.tag, text: q.text })),
        })),
      },
    };
    downloadText(`${(current.engineer.name || "engineer").replace(/\s+/g, "_")}_assessment.json`, JSON.stringify(payload, null, 2));
  };

  const importJSON = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const data = JSON.parse(text);
      // Accept either raw assessment or exported payload.
      const imported = {
        version: 1,
        id: data.id || (crypto?.randomUUID?.() ?? String(Date.now())),
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        engineer: data.engineer || makeBlankAssessment().engineer,
        notes: data.notes || "",
        answers: data.answers || makeBlankAssessment().answers,
      };
      // Ensure all questions exist.
      const blank = makeBlankAssessment();
      for (const k of Object.keys(blank.answers)) {
        if (imported.answers[k] === undefined) imported.answers[k] = blank.answers[k];
      }
      setAssessments((prev) => [imported, ...prev.filter((x) => x.id !== imported.id)]);
      setCurrentId(imported.id);
      setMode("report");
    } catch {
      alert("Invalid JSON file");
    } finally {
      e.target.value = "";
    }
  };

  const createNew = () => {
    const fresh = makeBlankAssessment();
    setAssessments((prev) => [fresh, ...prev]);
    setCurrentId(fresh.id);
    setMode("survey");
    setActiveAxisId("windows");
  };

  if (!current) return null;

  const computed = compute(current);

  const completion = useMemo(() => {
    // Here we treat completion as "all questions have a numeric score" (default is 5 so always complete)
    // If you later introduce N/A, update this.
    return 100;
  }, []);

  return (
    <div className="min-h-screen bg-[#07070a]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[#0C5394]/20 blur-3xl" />
        <div className="absolute top-56 -left-24 h-[420px] w-[420px] rounded-full bg-[#990001]/18 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-[480px] w-[480px] rounded-full bg-[#5B0F00]/18 blur-3xl" />
      </div>

      <AppHeader
        mode={mode}
        setMode={setMode}
        activeId={activeAxisId}
        setActiveId={setActiveAxisId}
        savedAt={savedAt}
        onNew={createNew}
        onExport={exportJSON}
        onImport={importJSON}
        onDownloadChart={downloadChartFromHeader}
      />

      <div className="mx-auto max-w-7xl px-4 py-6 grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
          <ProfileCard
            engineer={current.engineer}
            setEngineer={(fn) =>
              setCurrent((p) => ({
                ...p,
                updatedAt: new Date().toISOString(),
                engineer: typeof fn === "function" ? fn(p.engineer) : fn,
              }))
            }
            notes={current.notes}
            setNotes={(v) => setCurrent((p) => ({ ...p, updatedAt: new Date().toISOString(), notes: v }))}
          />

          <SectionCard title="Assessments" subtitle="Local list • click to switch engineer">
            <div className="space-y-2">
              {assessments.slice(0, 10).map((a) => (
                <button
                  key={a.id}
                  onClick={() => {
                    setCurrentId(a.id);
                    setMode("survey");
                  }}
                  className={`w-full text-left rounded-2xl border px-4 py-3 ${
                    a.id === currentId ? "border-white/20 bg-white/10" : "border-white/10 bg-white/[0.03] hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-extrabold text-white">{a.engineer.name || "(unnamed engineer)"}</div>
                      <div className="text-xs text-white/60 mt-0.5">{a.engineer.role || "—"} • {a.engineer.period || "—"}</div>
                    </div>
                    <Pill variant="neutral">{round1(compute(a).overallMean)}/10</Pill>
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-3 text-xs text-white/50">Tip: Export JSON per engineer and upload later for reporting.</div>
          </SectionCard>
        </div>

        <div className="lg:col-span-8 space-y-6">
          <AnimatePresence mode="wait">
            {mode === "survey" ? (
              <motion.div
                key="survey"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.18 }}
                className="space-y-6"
              >
                <SectionCard
                  title="Progress"
                  subtitle="Scores are 1–10. Use tags to see Scenario vs SOC vs Pentest bias later in the report."
                  right={<Pill variant="neutral">{completion}%</Pill>}
                >
                  <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-white font-extrabold">{current.engineer.name || "Engineer"}</div>
                        <div className="text-white/60 text-sm">Overall mean (live): {computed.overallMean}/10</div>
                      </div>
                      <button
                        onClick={() => setMode("report")}
                        className="px-3 py-2 rounded-xl text-sm font-semibold border border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/10 hover:text-white"
                      >
                        Go to Report
                      </button>
                    </div>
                  </div>
                </SectionCard>

                <AxisQuestions
                  axis={axis}
                  answers={current.answers}
                  setAnswer={(qid, v) =>
                    setCurrent((p) => ({
                      ...p,
                      updatedAt: new Date().toISOString(),
                      answers: { ...p.answers, [qid]: v },
                    }))
                  }
                />
              </motion.div>
            ) : (
              <motion.div
                key="report"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.18 }}
              >
                {/* Hidden chart ref for header download: we re-use the first chart in report */}
                <div className="hidden" ref={chartRefForHeader} />
                <ReportView
                  assessment={current}
                  setAssessment={(fn) => setCurrent((p) => (typeof fn === "function" ? fn(p) : fn))}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-10">
        <div className="text-xs text-white/50">
          Exported JSON includes schema + computed scores. Import lets you edit marks later and regenerate charts.
        </div>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar{display:none}
        .no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}
      `}</style>
    </div>
  );
}
