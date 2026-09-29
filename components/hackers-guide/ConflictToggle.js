import { useState } from "react";
import { Widget } from "./Widget";

const BASE = ["<h1>Welcome</h1>", "<p>This is our website.</p>"];
const OURS = ["<h1>Welcome, friend</h1>", "<p>This is our web site.</p>"];
const THEIRS = ["<h1>Welcome!</h1>", "<p>This is our website.</p>"];

export function ConflictToggle() {
  const [style, setStyle] = useState("zdiff3");
  const [hover, setHover] = useState(null);

  const section = (source, lines) => lines.map((l, i) => (
    <div key={source + i} className={`hg-line hg-${source} ${hover === source ? "hg-hot" : ""}`} onMouseEnter={() => setHover(source)} onMouseLeave={() => setHover(null)}>{l}</div>
  ));
  const marker = (text) => <div className="hg-line hg-marker">{text}</div>;

  return (
    <Widget title="Conflict styles">
      <div className="hg-toolbar">
        <label><input type="radio" name="hg-style" checked={style === "merge"} onChange={() => setStyle("merge")} /> <span className="hg-mono">merge.conflictStyle = merge</span> (the default)</label>
        <label><input type="radio" name="hg-style" checked={style === "zdiff3"} onChange={() => setStyle("zdiff3")} /> <span className="hg-mono">merge.conflictStyle = zdiff3</span></label>
      </div>
      <div className="hg-conflict">
        <div className="hg-sources">
          <div className={`hg-source hg-ours ${hover === "ours" ? "hg-hot" : ""}`} onMouseEnter={() => setHover("ours")} onMouseLeave={() => setHover(null)}>
            <div className="hg-source-name">ours (main)</div>
            <pre>{OURS.join("\n")}</pre>
          </div>
          <div className={`hg-source hg-base ${hover === "base" ? "hg-hot" : ""}`} onMouseEnter={() => setHover("base")} onMouseLeave={() => setHover(null)}>
            <div className="hg-source-name">merge base (fa2639d)</div>
            <pre>{BASE.join("\n")}</pre>
          </div>
          <div className={`hg-source hg-theirs ${hover === "theirs" ? "hg-hot" : ""}`} onMouseEnter={() => setHover("theirs")} onMouseLeave={() => setHover(null)}>
            <div className="hg-source-name">theirs (conflicting-branch)</div>
            <pre>{THEIRS.join("\n")}</pre>
          </div>
        </div>
        <div className="hg-markers">
          <div className="hg-source-name">index.html</div>
          {marker("<<<<<<< HEAD")}
          {section("ours", OURS)}
          {style === "zdiff3" && marker("||||||| fa2639d")}
          {style === "zdiff3" && section("base", BASE)}
          {marker("=======")}
          {section("theirs", THEIRS)}
          {marker(">>>>>>> conflicting-branch")}
        </div>
      </div>
    </Widget>
  );
}
