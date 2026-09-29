import { useState } from "react";
import { Graph } from "./graph";
import { createRepo, layout } from "./model";
import { Widget } from "./Widget";

const repo = createRepo({
  commits: [
    { letter: "A" }, { letter: "B", parents: ["A"] }, { letter: "C", parents: ["B"] },
    { letter: "D", parents: ["C"] }, { letter: "E", parents: ["C"] }, { letter: "M", parents: ["D", "E"], message: "Merge branch 'topic'" },
  ],
  refs: { main: "M", topic: "E" },
  head: "main",
});

const byLetter = Object.fromEntries(Object.values(repo.commits).map((c) => [c.letter, c.id]));
const starts = { HEAD: repo.refs.main, main: repo.refs.main, topic: repo.refs.topic };

// Walk `steps` (a list of parent numbers) from a commit.
function follow(id, steps) {
  for (const n of steps) {
    const p = repo.commits[id].parents[n - 1];
    if (!p) return null;
    id = p;
  }
  return id;
}

// Every way of naming each commit from HEAD, main and topic, shortest first.
function names() {
  const result = {};
  const add = (id, name) => (result[id] = result[id] || []).push(name);
  const paths = [[]];
  for (let len = 1; len <= 4; len++) {
    for (const p of [...paths]) {
      if (p.length !== len - 1) continue;
      paths.push([...p, 1], [...p, 2]);
    }
  }
  for (const [start, sid] of Object.entries(starts)) {
    for (const steps of paths) {
      const id = follow(sid, steps);
      if (!id) continue;
      let text = start;
      let tilde = 0;
      const flush = () => { if (tilde) text += tilde === 1 ? "~" : `~${tilde}`; tilde = 0; };
      for (const n of steps) {
        if (n === 1) tilde++;
        else { flush(); text += `^${n}`; }
      }
      flush();
      add(id, text);
    }
  }
  for (const id in result) result[id] = [...new Set(result[id])].sort((a, b) => a.length - b.length || a.localeCompare(b)).slice(0, 8);
  return result;
}
const NAMES = names();

function evaluate(expr) {
  const m = expr.trim().match(/^(HEAD|main|topic|[A-Z])((?:[~^]\d*)*)$/);
  if (!m) return { error: `unknown revision '${expr.trim()}'` };
  let id = starts[m[1]] ?? byLetter[m[1]];
  const ops = m[2].match(/[~^]\d*/g) || [];
  for (const op of ops) {
    const n = op.length > 1 ? parseInt(op.slice(1), 10) : 1;
    if (op[0] === "~") for (let i = 0; i < n; i++) { id = id && repo.commits[id].parents[0]; }
    else id = id && repo.commits[id].parents[n - 1];
    if (!id) return { error: `${expr.trim()} does not exist` };
  }
  return { id };
}

export function RevisionExplorer() {
  const [selected, setSelected] = useState(repo.refs.main);
  const [expr, setExpr] = useState("HEAD^2~1");
  const evaluated = evaluate(expr);
  const shown = evaluated.id || selected;
  const { shapes, edges } = layout(repo);

  return (
    <Widget title="Revision explorer">
      <div className="hg-graph-wrap">
        <Graph shapes={shapes} edges={edges} onSelect={(id) => { setSelected(id); setExpr(""); }} selected={shown} />
      </div>
      <div className="hg-toolbar">
        <label>
          <span className="hg-mono">git rev-parse </span>
          <input value={expr} onChange={(e) => { setExpr(e.target.value); const r = evaluate(e.target.value); if (r.id) setSelected(r.id); }} size="14" spellCheck={false} aria-label="revision expression" className="hg-mono" />
        </label>
        <span className="hg-mono hg-result">{evaluated.id ? `${repo.commits[evaluated.id].letter}` : `fatal: ${evaluated.error}`}</span>
      </div>
      <pre className="hg-output">
        {`commit ${repo.commits[shown].letter}: ${repo.commits[shown].message}\n`}
        {`names:  ${(NAMES[shown] || []).join("  ")}`}
      </pre>
    </Widget>
  );
}
