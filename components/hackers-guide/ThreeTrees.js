import { useEffect, useState } from "react";
import { sha1 } from "./sha1";
import { Widget } from "./Widget";

const START = ["This is the readme."];
const EXTRA = ["Some more information here.", "Even more information.", "A third line, for good measure."];

function statusCode(head, index, work) {
  const x = index.join("\n") !== head.join("\n") ? "M" : " ";
  const y = work.join("\n") !== index.join("\n") ? "M" : " ";
  return x + y;
}

function diff(from, to) {
  if (from.join("\n") === to.join("\n")) return "";
  const out = [];
  const max = Math.max(from.length, to.length);
  for (let i = 0; i < max; i++) {
    if (from[i] === to[i]) out.push(` ${from[i]}`);
    else {
      if (from[i] != null) out.push(`-${from[i]}`);
      if (to[i] != null) out.push(`+${to[i]}`);
    }
  }
  return out.join("\n");
}

function Tree({ name, note, lines, hash, className }) {
  return (
    <div className={`hg-tree ${className}`}>
      <div className="hg-tree-name">{name}</div>
      <div className="hg-tree-note">{note}</div>
      <pre className="hg-tree-file">{lines.join("\n")}</pre>
      <div className="hg-tree-hash">blob {hash ? hash.slice(0, 7) : "…"}</div>
    </div>
  );
}

export function ThreeTrees() {
  const [head, setHead] = useState(START);
  const [index, setIndex] = useState(START);
  const [work, setWork] = useState(START);
  const [last, setLast] = useState("");
  const [hashes, setHashes] = useState({});

  useEffect(() => {
    let cancelled = false;
    const content = (lines) => lines.join("\n") + "\n";
    Promise.all([head, index, work].map((t) => sha1(`blob ${new TextEncoder().encode(content(t)).length}\0${content(t)}`))).then(([h, i, w]) => {
      if (!cancelled) setHashes({ head: h, index: i, work: w });
    });
    return () => { cancelled = true; };
  }, [head, index, work]);

  const status = statusCode(head, index, work);
  const edit = () => {
    const next = EXTRA.find((l) => !work.includes(l));
    if (!next) return setLast("$ vim README\n(nothing left to add; try git restore README)");
    setWork([...work, next]);
    setLast("$ vim README");
  };

  return (
    <Widget title="Index playground">
      <div className="hg-toolbar">
        <button onClick={edit}>edit README</button>
        <button onClick={() => { setIndex(work); setLast("$ git add README"); }} disabled={work.join() === index.join()}>git add README</button>
        <button onClick={() => { setHead(index); setLast("$ git commit -m 'Update README'\n[main] Update README"); }} disabled={index.join() === head.join()}>git commit</button>
        <button onClick={() => { setIndex(head); setLast("$ git restore --staged README"); }} disabled={index.join() === head.join()}>git restore --staged README</button>
        <button onClick={() => { setWork(index); setLast("$ git restore README"); }} disabled={work.join() === index.join()}>git restore README</button>
      </div>
      <div className="hg-trees">
        <Tree name="Working tree" note="the file on disk" lines={work} hash={hashes.work} className="hg-tree-work" />
        <Tree name="Index" note="the next commit" lines={index} hash={hashes.index} className="hg-tree-index" />
        <Tree name="HEAD" note="the last commit" lines={head} hash={hashes.head} className="hg-tree-head" />
      </div>
      <div className="hg-panels">
        <pre className="hg-output">{last || "(click a button)"}{"\n\n"}$ git status --short{"\n"}{status.trim() ? `${status} README` : "(clean)"}</pre>
        <pre className="hg-output">$ git diff{"\n"}{diff(index, work) || "(no output)"}{"\n\n"}$ git diff --staged{"\n"}{diff(head, index) || "(no output)"}</pre>
      </div>
    </Widget>
  );
}
