import { useState } from "react";
import { BLUE, GREEN, ORANGE, Graph } from "./graph";
import { Widget } from "./Widget";

const HASHES = ["c4fa71b", "1c2025c", "97a922f", "517b32f", "30f093d", "0920edc", "25f24b5", "a96a8c1", "2a39a02", "7565bc1", "b26f8bb", "bc716fa", "9881359"];
const FIRST_BAD = 7;
const messages = (i) => (i === 0 ? "Add calculator" : `Change ${i}`);

// Git picks the candidate that splits the untested range most evenly.
function candidate(good, bad) {
  const n = bad - good - 1;
  return n > 0 ? bad - Math.ceil(n / 2) : null;
}
const bisectLine = (good, bad) => {
  const n = bad - good - 1;
  const c = candidate(good, bad);
  return `Bisecting: ${Math.floor((n - 1) / 2)} revisions left to test after this (roughly ${Math.floor(Math.log2(n))} step${Math.floor(Math.log2(n)) === 1 ? "" : "s"})\n[${HASHES[c]}] ${messages(c)}`;
};

const initial = { good: 0, bad: 12, started: true, log: [`$ git bisect start HEAD v1.0\n${bisectLine(0, 12)}`], tested: null, done: false, steps: 0 };

export function BisectStepper() {
  const [s, setS] = useState(initial);
  const cand = candidate(s.good, s.bad);

  const answer = (isBad) => {
    if (cand == null || s.done) return;
    const good = isBad ? s.good : cand;
    const bad = isBad ? cand : s.bad;
    const next = candidate(good, bad);
    const cmd = `$ git bisect ${isBad ? "bad" : "good"}`;
    if (next == null) {
      setS({ ...s, good, bad, done: true, steps: s.steps + 1, tested: null, log: [...s.log, `${cmd}\n${HASHES[bad]} is the first bad commit\n    ${messages(bad)}`] });
    } else {
      setS({ ...s, good, bad, steps: s.steps + 1, tested: null, log: [...s.log, `${cmd}\n${bisectLine(good, bad)}`] });
    }
  };
  const test = () => cand != null && setS({ ...s, tested: cand >= FIRST_BAD ? "fail" : "pass", log: [...s.log, `$ ./test.sh\n${cand >= FIRST_BAD ? "(exit code 1: the test fails)" : "(exit code 0: the test passes)"}`] });
  const reset = () => setS(initial);

  const fills = {};
  for (let i = 0; i <= 12; i++) fills["c" + (i + 1)] = i <= s.good ? GREEN : i >= s.bad ? ORANGE : BLUE;
  const shapes = HASHES.map((h, i) => ({ kind: "circle", id: "c" + (i + 1), x: i * 66, y: 0, text: String(i), fill: fills["c" + (i + 1)] }));
  const edges = HASHES.slice(1).map((h, i) => ({ from: "c" + (i + 2), to: "c" + (i + 1) }));
  if (cand != null && !s.done) {
    shapes.push({ kind: "label", id: "t", x: cand * 66, y: -70, text: "HEAD", mono: true, highlight: true });
    edges.push({ from: "t", to: "c" + (cand + 1), dashed: true });
  }
  shapes.push({ kind: "label", id: "g", x: 0, y: 70, text: "v1.0", mono: true }, { kind: "label", id: "b", x: 12 * 66, y: 70, text: "main", mono: true });
  edges.push({ from: "g", to: "c1" }, { from: "b", to: "c13" });

  return (
    <Widget title="Bisect playground">
      <div className="hg-graph-wrap">
        <Graph shapes={shapes} edges={edges} selected={cand != null && !s.done ? "c" + (cand + 1) : undefined} />
      </div>
      <div className="hg-toolbar">
        <button onClick={test} disabled={cand == null || s.done || s.tested}>./test.sh</button>
        <button onClick={() => answer(false)} disabled={cand == null || s.done}>git bisect good</button>
        <button onClick={() => answer(true)} disabled={cand == null || s.done}>git bisect bad</button>
        <span className="hg-spacer" />
        <span className="hg-mono">{s.done ? `found in ${s.steps} steps` : `${s.steps} step${s.steps === 1 ? "" : "s"} so far`}</span>
        <button onClick={reset}>git bisect reset</button>
      </div>
      <pre className="hg-output hg-scroll">{s.log.slice(-4).join("\n\n")}</pre>
    </Widget>
  );
}
