// Generates the SVG diagrams for A Hacker's Guide to Git (second edition).
//
//   node book/diagrams.mjs
//
// Every diagram is described as a small list of shapes and the arrows between
// them, and rendered to public/uploads/a-hackers-guide-to-git/<name>.svg. The
// SVGs are plain enough to open in Inkscape or Figma if you'd rather tweak a
// diagram by hand.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "uploads", "a-hackers-guide-to-git");

const FONT = "Helvetica Neue, Helvetica, Arial, sans-serif";
const MONO = "SFMono-Regular, Menlo, Consolas, Liberation Mono, monospace";
const BLUE = "#729fcf";
const BLUE_DARK = "#3465a4";
const GREEN = "#73d216";
const GREEN_DARK = "#4e9a06";
const ORANGE = "#fcaf3e";
const ORANGE_DARK = "#ce5c00";
const GREY = "#888a85";
const INK = "#2e3436";

const R = 26; // commit circle radius
const COL = 110; // horizontal spacing between commits
const ROW = 90; // vertical spacing between commits

// --- shapes -----------------------------------------------------------------

function commit(id, col, row, opts = {}) {
  return { kind: "circle", id, x: col * COL, y: row * ROW, text: opts.text ?? id, ghost: !!opts.ghost, fill: opts.fill };
}

function label(id, text, col, row, opts = {}) {
  return { kind: "label", id, x: col * COL, y: row * ROW, text, mono: !!opts.mono, ghost: !!opts.ghost, plain: !!opts.plain };
}

// A rectangle with a bold title line and optional monospace rows.
function box(id, x, y, opts) {
  return { kind: "box", id, x, y, title: opts.title, subtitle: opts.subtitle, rows: opts.rows ?? [], fill: opts.fill ?? BLUE, stroke: opts.stroke ?? BLUE_DARK, w: opts.w, ghost: !!opts.ghost };
}

function edge(from, to, opts = {}) {
  return { from, to, text: opts.text, dashed: !!opts.dashed, ghost: !!opts.ghost, bend: opts.bend ?? 0, textDx: opts.textDx ?? 0, textDy: opts.textDy ?? 0, elbow: !!opts.elbow };
}

function region(text, x, y, w, h) {
  return { kind: "region", text, x, y, w, h };
}

// --- geometry ---------------------------------------------------------------

const textWidth = (s, size, mono) => s.length * size * (mono ? 0.62 : 0.55);

function bounds(shape) {
  if (shape.kind === "circle") return { x: shape.x - R, y: shape.y - R, w: 2 * R, h: 2 * R };
  if (shape.kind === "label") {
    const w = textWidth(shape.text, 18, shape.mono) + 24;
    return { x: shape.x - w / 2, y: shape.y - 18, w, h: 36 };
  }
  if (shape.kind === "box") {
    const lines = [shape.title, shape.subtitle, ...shape.rows].filter(Boolean);
    const w = shape.w ?? Math.max(...lines.map((l) => textWidth(l, 16, true))) + 32;
    const h = 20 + (shape.title ? 26 : 0) + (shape.subtitle ? 22 : 0) + shape.rows.length * 22;
    return { x: shape.x, y: shape.y, w, h };
  }
  return { x: shape.x, y: shape.y, w: shape.w, h: shape.h };
}

const centre = (b) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });

// Point on the boundary of a shape, in the direction of (tx, ty).
function boundaryPoint(shape, tx, ty) {
  const b = bounds(shape);
  const c = centre(b);
  const dx = tx - c.x;
  const dy = ty - c.y;
  if (shape.kind === "circle") {
    const len = Math.hypot(dx, dy) || 1;
    return { x: c.x + (dx / len) * R, y: c.y + (dy / len) * R };
  }
  const sx = dx === 0 ? Infinity : (b.w / 2) / Math.abs(dx);
  const sy = dy === 0 ? Infinity : (b.h / 2) / Math.abs(dy);
  const s = Math.min(sx, sy);
  return { x: c.x + dx * s, y: c.y + dy * s };
}

// --- rendering --------------------------------------------------------------

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function renderShape(s) {
  const b = bounds(s);
  const c = centre(b);
  const opacity = s.ghost ? ' opacity="0.35"' : "";
  if (s.kind === "circle") {
    const fill = s.fill ?? BLUE;
    const stroke = fill === GREEN ? GREEN_DARK : fill === ORANGE ? ORANGE_DARK : BLUE_DARK;
    return `<g id="${esc(s.id)}"${opacity}${s.ghost ? ' stroke-dasharray="6 4"' : ""}>
    <circle cx="${c.x}" cy="${c.y}" r="${R}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>
    <text x="${c.x}" y="${c.y}" text-anchor="middle" dominant-baseline="central" font-family="${FONT}" font-size="22" fill="${INK}">${esc(s.text)}</text>
  </g>`;
  }
  if (s.kind === "label") {
    const rect = s.plain ? "" : `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="#ffffff" stroke="${BLUE_DARK}" stroke-width="1.5"${s.ghost ? ' stroke-dasharray="6 4"' : ""}/>`;
    return `<g id="${esc(s.id)}"${opacity}>
    ${rect}
    <text x="${c.x}" y="${c.y}" text-anchor="middle" dominant-baseline="central" font-family="${s.mono ? MONO : FONT}" font-size="18" fill="${s.plain ? GREY : INK}"${s.plain ? ' font-style="italic"' : ""}>${esc(s.text)}</text>
  </g>`;
  }
  if (s.kind === "box") {
    let y = b.y + 16;
    const lines = [];
    if (s.title) {
      lines.push(`<text x="${b.x + 16}" y="${y + 8}" font-family="${MONO}" font-size="16" font-weight="bold" fill="${INK}">${esc(s.title)}</text>`);
      y += 26;
    }
    if (s.subtitle) {
      lines.push(`<text x="${b.x + 16}" y="${y + 6}" font-family="${FONT}" font-size="15" fill="${INK}">${esc(s.subtitle)}</text>`);
      y += 22;
    }
    for (const row of s.rows) {
      lines.push(`<text x="${b.x + 16}" y="${y + 6}" font-family="${MONO}" font-size="15" fill="${INK}" xml:space="preserve">${esc(row)}</text>`);
      y += 22;
    }
    return `<g id="${esc(s.id)}"${opacity}>
    <rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="${s.fill}" stroke="${s.stroke}" stroke-width="1.5"${s.ghost ? ' stroke-dasharray="6 4"' : ""}/>
    ${lines.join("\n    ")}
  </g>`;
  }
  if (s.kind === "region") {
    return `<g>
    <rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" fill="none" stroke="${GREY}" stroke-width="1.5" stroke-dasharray="8 6" rx="6"/>
    <text x="${s.x + 12}" y="${s.y + 22}" font-family="${FONT}" font-size="16" font-style="italic" fill="${GREY}">${esc(s.text)}</text>
  </g>`;
  }
  throw new Error(`unknown shape ${s.kind}`);
}

function renderEdge(e, byId) {
  const from = byId[e.from];
  const to = byId[e.to];
  if (!from || !to) throw new Error(`edge ${e.from} -> ${e.to} references a missing shape`);
  const fb = bounds(from);
  const tb = bounds(to);
  const fc = centre(fb);
  const tc = centre(tb);
  if (e.elbow) {
    const sy = fb.y + fb.h;
    const ty = tb.y;
    const my = (sy + ty) / 2;
    return `<path d="M ${fc.x} ${sy} V ${my} H ${tc.x} V ${ty}" fill="none" stroke="${INK}" stroke-width="1.5" marker-end="url(#arrow)"/>`;
  }
  // Optional control point so parallel arrows don't overlap.
  const mx = (fc.x + tc.x) / 2;
  const my = (fc.y + tc.y) / 2;
  const nx = -(tc.y - fc.y);
  const ny = tc.x - fc.x;
  const nlen = Math.hypot(nx, ny) || 1;
  const cx = mx + (nx / nlen) * e.bend;
  const cy = my + (ny / nlen) * e.bend;
  const p1 = boundaryPoint(from, cx, cy);
  const p2 = boundaryPoint(to, cx, cy);
  const d = e.bend ? `M ${p1.x} ${p1.y} Q ${cx} ${cy} ${p2.x} ${p2.y}` : `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
  const stroke = e.ghost ? GREY : INK;
  const marker = e.ghost ? "arrow-ghost" : "arrow";
  let text = "";
  if (e.text) {
    const lx = (e.bend ? (p1.x + 2 * cx + p2.x) / 4 : mx) + e.textDx;
    const ly = (e.bend ? (p1.y + 2 * cy + p2.y) / 4 : my) + (cy <= my ? -8 : 20) + e.textDy;
    text = `\n  <text x="${lx}" y="${ly}" text-anchor="middle" font-family="${FONT}" font-size="15" fill="${INK}">${esc(e.text)}</text>`;
  }
  return `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="1.5"${e.dashed ? ' stroke-dasharray="6 4"' : ""}${e.ghost ? ' opacity="0.5"' : ""} marker-end="url(#${marker})"/>${text}`;
}

function render(name, shapes, edges, pad = 20) {
  const byId = Object.fromEntries(shapes.filter((s) => s.id).map((s) => [s.id, s]));
  const all = shapes.map(bounds);
  const minX = Math.min(...all.map((b) => b.x)) - pad;
  const minY = Math.min(...all.map((b) => b.y)) - pad;
  const maxX = Math.max(...all.map((b) => b.x + b.w)) + pad;
  const maxY = Math.max(...all.map((b) => b.y + b.h)) + pad;
  const w = Math.round(maxX - minX);
  const h = Math.round(maxY - minY);
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${w} ${h}" width="${w}" height="${h}" font-size="18">
  <title>${esc(name)}</title>
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="${INK}"/>
    </marker>
    <marker id="arrow-ghost" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="${GREY}"/>
    </marker>
  </defs>
  ${shapes.filter((s) => s.kind === "region").map(renderShape).join("\n  ")}
  ${edges.map((e) => renderEdge(e, byId)).join("\n  ")}
  ${shapes.filter((s) => s.kind !== "region").map(renderShape).join("\n  ")}
</svg>
`;
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, `${name}.svg`), svg);
  console.log(`wrote ${name}.svg (${w}x${h})`);
}

// --- the diagrams -----------------------------------------------------------

const diagrams = {};

// Objects: a tree is a directory listing that points at blobs and other trees.
diagrams["tree-graph"] = () => {
  const W = 250;
  const shapes = [
    box("root", 0, 0, { title: "292240e", subtitle: "(root)", rows: ["Type  Hash     Name", "blob  9761654  README", "tree  675bff7  src"], w: W }),
    box("readme", 0, 200, { title: "9761654", subtitle: "README", rows: ["This is the readme."], fill: GREEN, stroke: GREEN_DARK, w: W }),
    box("src", 330, 200, { title: "675bff7", subtitle: "src", rows: ["Type  Hash     Name", "blob  032e1d1  hello.c"], w: W }),
    box("hello", 330, 380, { title: "032e1d1", subtitle: "hello.c", rows: ["#include <stdio.h>", "", "int main() {", '    puts("Hello, world!");', "}"], fill: GREEN, stroke: GREEN_DARK, w: W }),
  ];
  const edges = [edge("root", "readme"), edge("root", "src", { elbow: true }), edge("src", "hello")];
  render("tree-graph", shapes, edges);
};

// Commits: each commit points at a tree and at its parent.
diagrams["commit-chain"] = () => {
  const W = 270;
  const shapes = [
    box("c1", 0, 0, { title: "39f6ea2", subtitle: "commit", rows: ["tree    9d073fc", "", "author  Joseph Wynn", "", "First commit"], w: W }),
    box("c2", 360, 0, { title: "29bb055", subtitle: "commit", rows: ["tree    b86d3ae", "parent  39f6ea2", "author  Joseph Wynn", "", "Update README"], w: W }),
    box("t1", 0, 240, { title: "9d073fc", subtitle: "tree", rows: ["blob  9761654  README"], w: W }),
    box("t2", 360, 240, { title: "b86d3ae", subtitle: "tree", rows: ["blob  a5f1c30  README"], w: W }),
    box("b1", 0, 380, { title: "9761654", subtitle: "blob", rows: ["This is the readme.", ""], fill: GREEN, stroke: GREEN_DARK, w: W }),
    box("b2", 360, 380, { title: "a5f1c30", subtitle: "blob", rows: ["This is the readme.", "Some more information here."], fill: GREEN, stroke: GREEN_DARK, w: W }),
  ];
  const edges = [edge("c2", "c1"), edge("c1", "t1"), edge("c2", "t2"), edge("t1", "b1"), edge("t2", "b2")];
  render("commit-chain", shapes, edges);
};

// The index sits between the working tree and the repository.
diagrams["three-trees"] = () => {
  const shapes = [
    box("wt", 0, 0, { title: "Working tree", subtitle: "the files you edit", w: 180, fill: "#ffffff", stroke: GREY }),
    box("idx", 350, 0, { title: "Index", subtitle: "the next commit's tree", w: 190, fill: ORANGE, stroke: ORANGE_DARK }),
    box("repo", 710, 0, { title: "Repository", subtitle: "commits reachable from HEAD", w: 240 }),
  ];
  const edges = [
    edge("wt", "idx", { text: "git add", bend: -50 }),
    edge("idx", "repo", { text: "git commit", bend: -50 }),
    edge("repo", "idx", { text: "git restore --staged", bend: -50 }),
    edge("idx", "wt", { text: "git restore", bend: -50 }),
  ];
  render("three-trees", shapes, edges, 30);
};

// HEAD is a symbolic ref to a branch, which is a ref to a commit.
diagrams["head-and-branches"] = () => {
  const shapes = [
    commit("A", 0, 1), commit("B", 1, 1), commit("C", 2, 1),
    label("main", "refs/heads/main", 2, 0, { mono: true }),
    label("test", "refs/heads/test-branch", 2, 2, { mono: true }),
    label("HEAD", "HEAD", 2, -1, { mono: true }),
  ];
  const edges = [edge("B", "A"), edge("C", "B"), edge("main", "C"), edge("test", "C"), edge("HEAD", "main")];
  render("head-and-branches", shapes, edges);
};

diagrams["detached-head"] = () => {
  const shapes = [
    commit("A", 0, 1), commit("B", 1, 1), commit("C", 2, 1),
    label("main", "refs/heads/main", 2, 0, { mono: true }),
    label("HEAD", "HEAD", 1, 2, { mono: true }),
  ];
  const edges = [edge("B", "A"), edge("C", "B"), edge("main", "C"), edge("HEAD", "B")];
  render("detached-head", shapes, edges);
};

// Merging. A = Initial commit, B = Finished the new feature, C = Fixed some wording.
diagrams["branch-feature-hotfix"] = () => {
  const shapes = [
    commit("A", 0, 1), commit("B", 1, 0), commit("C", 1, 2),
    label("feature", "feature-branch", 2.4, 0, { mono: true }),
    label("hotfix", "hotfix", 2.2, 2, { mono: true }),
    label("main", "main", 0, 2.5, { mono: true }),
  ];
  const edges = [edge("B", "A"), edge("C", "A"), edge("feature", "B"), edge("hotfix", "C"), edge("main", "A")];
  render("branch-feature-hotfix", shapes, edges);
};

diagrams["branch-merge-hotfix"] = () => {
  const shapes = [
    commit("A", 0, 1), commit("B", 1, 0), commit("C", 1, 2),
    label("feature", "feature-branch", 2.4, 0, { mono: true }),
    label("hotfix", "hotfix", 2.2, 2, { mono: true }),
    label("main", "main", 1, 3.2, { mono: true }),
  ];
  const edges = [edge("B", "A"), edge("C", "A"), edge("feature", "B"), edge("hotfix", "C"), edge("main", "C")];
  render("branch-merge-hotfix", shapes, edges);
};

diagrams["merge-base"] = () => {
  const shapes = [
    commit("A", 0, 1), commit("B", 1, 0), commit("C", 1, 2),
    label("theirs", "theirs (feature-branch)", 2.7, 0),
    label("ours", "ours (main)", 2.3, 2),
    label("base", "merge base", 0, 2.5),
  ];
  const edges = [edge("B", "A"), edge("C", "A"), edge("theirs", "B"), edge("ours", "C"), edge("base", "A")];
  render("merge-base", shapes, edges);
};

diagrams["branch-merge-feature"] = () => {
  const shapes = [
    commit("A", 0, 1), commit("B", 1, 0), commit("C", 1, 2), commit("D", 2, 1),
    label("feature", "feature-branch", 1, -1, { mono: true }),
    label("hotfix", "hotfix", 1, 3.2, { mono: true }),
    label("main", "main", 3.2, 1, { mono: true }),
  ];
  const edges = [edge("B", "A"), edge("C", "A"), edge("D", "B"), edge("D", "C"), edge("feature", "B"), edge("hotfix", "C"), edge("main", "D")];
  render("branch-merge-feature", shapes, edges);
};

// Cherry-picking. main: A B E F. foo: C D (from B).
const pickBase = () => [commit("A", 0, 1), commit("B", 1, 1), commit("E", 2, 1), commit("F", 3, 1), commit("C", 2, 0), commit("D", 3, 0)];
const pickEdges = () => [edge("B", "A"), edge("E", "B"), edge("F", "E"), edge("C", "B"), edge("D", "C")];

diagrams["cherry-pick-before"] = () => {
  render("cherry-pick-before", [...pickBase(), label("HEAD", "HEAD", 3, -1, { mono: true })], [...pickEdges(), edge("HEAD", "D")]);
};

diagrams["cherry-pick-after"] = () => {
  const shapes = [...pickBase(), commit("F2", 4, 0, { text: "F'" }), label("HEAD", "HEAD", 4, -1, { mono: true })];
  render("cherry-pick-after", shapes, [...pickEdges(), edge("F2", "D"), edge("HEAD", "F2")]);
};

diagrams["graph-branch-labels"] = () => {
  const shapes = [...pickBase(), label("main", "main", 3, 2, { mono: true }), label("foo", "foo", 3, -1, { mono: true })];
  render("graph-branch-labels", shapes, [...pickEdges(), edge("main", "F"), edge("foo", "D")]);
};

diagrams["foo-tmp"] = () => {
  const shapes = [...pickBase(), label("main", "main", 3, 2, { mono: true }), label("foo", "foo", 3, -1, { mono: true }), label("tmp", "foo-tmp", 4.2, 1, { mono: true })];
  render("foo-tmp", shapes, [...pickEdges(), edge("main", "F"), edge("foo", "D"), edge("tmp", "F")]);
};

diagrams["cherry-pick-c-d"] = () => {
  const shapes = [...pickBase(), commit("C2", 4, 1, { text: "C'" }), commit("D2", 5, 1, { text: "D'" }),
    label("main", "main", 3, 2, { mono: true }), label("foo", "foo", 3, -1, { mono: true }), label("tmp", "foo-tmp", 5, 2, { mono: true })];
  render("cherry-pick-c-d", shapes, [...pickEdges(), edge("C2", "F"), edge("D2", "C2"), edge("main", "F"), edge("foo", "D"), edge("tmp", "D2")]);
};

diagrams["cherry-pick-final"] = () => {
  const shapes = [commit("A", 0, 1), commit("B", 1, 1), commit("E", 2, 1), commit("F", 3, 1), commit("C", 2, 0, { ghost: true }), commit("D", 3, 0, { ghost: true }),
    commit("C2", 4, 1, { text: "C'" }), commit("D2", 5, 1, { text: "D'" }),
    label("main", "main", 3, 2, { mono: true }), label("foo", "foo", 5, 2, { mono: true })];
  const edges = [edge("B", "A"), edge("E", "B"), edge("F", "E"), edge("C", "B", { ghost: true }), edge("D", "C", { ghost: true }),
    edge("C2", "F"), edge("D2", "C2"), edge("main", "F"), edge("foo", "D2")];
  render("cherry-pick-final", shapes, edges);
};

// rebase --onto. main: A B E F. bar: G H (from B). baz: I J (from H).
diagrams["rebase-onto-before"] = () => {
  const shapes = [commit("A", 0, 1), commit("B", 1, 1), commit("E", 2, 1), commit("F", 3, 1),
    commit("G", 2, 0), commit("H", 3, 0), commit("I", 4, 0), commit("J", 5, 0),
    label("main", "main", 3, 2, { mono: true }), label("bar", "bar", 3, -1, { mono: true }), label("baz", "baz", 5, -1, { mono: true })];
  const edges = [edge("B", "A"), edge("E", "B"), edge("F", "E"), edge("G", "B"), edge("H", "G"), edge("I", "H"), edge("J", "I"),
    edge("main", "F"), edge("bar", "H"), edge("baz", "J")];
  render("rebase-onto-before", shapes, edges);
};

diagrams["rebase-onto-after"] = () => {
  const shapes = [commit("A", 0, 1), commit("B", 1, 1), commit("E", 2, 1), commit("F", 3, 1),
    commit("G", 2, 0), commit("H", 3, 0), commit("I", 4, 0, { ghost: true }), commit("J", 5, 0, { ghost: true }),
    commit("I2", 4, 1, { text: "I'" }), commit("J2", 5, 1, { text: "J'" }),
    label("main", "main", 3, 2, { mono: true }), label("bar", "bar", 3, -1, { mono: true }), label("baz", "baz", 5, 2, { mono: true })];
  const edges = [edge("B", "A"), edge("E", "B"), edge("F", "E"), edge("G", "B"), edge("H", "G"), edge("I", "H", { ghost: true }), edge("J", "I", { ghost: true }),
    edge("I2", "F"), edge("J2", "I2"), edge("main", "F"), edge("bar", "H"), edge("baz", "J2")];
  render("rebase-onto-after", shapes, edges);
};

// Remote-tracking branches: your clone keeps its own copy of origin's refs.
diagrams["remote-tracking"] = () => {
  const shapes = [
    region("origin (bare-repo)", -60, -70, 560, 200),
    commit("rA", 1, 0, { text: "A" }), commit("rB", 2, 0, { text: "B" }),
    label("rmain", "refs/heads/main", 2, 0.9, { mono: true }),
    region("clone-of-bare-repo", -60, 230, 560, 370),
    commit("A", 1, 4.3, { text: "A" }), commit("B", 2, 4.3, { text: "B" }), commit("C", 3, 4.3, { text: "C" }),
    label("main", "refs/heads/main", 3, 5.6, { mono: true }),
    label("omain", "refs/remotes/origin/main", 2, 3.2, { mono: true }),
  ];
  const edges = [edge("rB", "rA"), edge("rmain", "rB"), edge("B", "A"), edge("C", "B"), edge("main", "C"), edge("omain", "B"),
    edge("omain", "rmain", { dashed: true, text: "git fetch", textDx: 55 })];
  render("remote-tracking", shapes, edges);
};

// Worktrees: several working trees, one repository.
diagrams["worktrees"] = () => {
  const shapes = [
    box("git", 260, 0, { title: ".git/", subtitle: "objects, refs, config", w: 220 }),
    box("main", 0, 170, { title: "clone-of-bare-repo/", subtitle: "branch: main", rows: [".git/  (the directory above)"], fill: "#ffffff", stroke: GREY }),
    box("hotfix", 400, 170, { title: "hotfix-worktree/", subtitle: "branch: hotfix", rows: [".git   gitdir: .git/worktrees/hotfix-worktree"], fill: "#ffffff", stroke: GREY }),
  ];
  render("worktrees", shapes, [edge("main", "git"), edge("hotfix", "git")]);
};

// Stashes are merge commits: the index commit is the second parent.
diagrams["stash"] = () => {
  const shapes = [commit("A", 0, 1), commit("B", 1, 0), commit("C", 2, 1),
    label("main", "main", 0, 2.5, { mono: true }), label("stash", "refs/stash", 3.4, 1, { mono: true }),
    label("bnote", "index", 1, -1), label("cnote", "working tree", 2, 2.5)];
  const edges = [edge("B", "A"), edge("C", "A"), edge("C", "B"), edge("main", "A"), edge("stash", "C"), edge("bnote", "B", { dashed: true }), edge("cnote", "C", { dashed: true })];
  render("stash", shapes, edges);
};

diagrams["stash-untracked"] = () => {
  const shapes = [commit("A", 0, 1), commit("B", 1, 0), commit("U", 1, 2), commit("C", 2, 1),
    label("main", "main", 0, 2.5, { mono: true }), label("stash", "refs/stash", 3.4, 1, { mono: true }),
    label("bnote", "index", 1, -1), label("unote", "untracked files", 1, 3.2), label("cnote", "working tree", 2.6, -1)];
  const edges = [edge("B", "A"), edge("C", "A"), edge("C", "B"), edge("C", "U"), edge("main", "A"), edge("stash", "C"),
    edge("bnote", "B", { dashed: true }), edge("unote", "U", { dashed: true }), edge("cnote", "C", { dashed: true })];
  render("stash-untracked", shapes, edges);
};

// Loose objects versus a packfile.
diagrams["packfile"] = () => {
  const shapes = [
    region("loose objects", -20, -20, 300, 250),
    box("l1", 0, 10, { title: "9761654", subtitle: "blob, zlib compressed", w: 260, fill: GREEN, stroke: GREEN_DARK }),
    box("l2", 0, 80, { title: "a5f1c30", subtitle: "blob, zlib compressed", w: 260, fill: GREEN, stroke: GREEN_DARK }),
    box("l3", 0, 150, { title: "39f6ea2", subtitle: "commit, zlib compressed", w: 260 }),
    region("pack-1e6609e.pack", 380, -20, 330, 250),
    box("p1", 400, 10, { title: "9761654", subtitle: "blob, full copy", w: 290, fill: GREEN, stroke: GREEN_DARK }),
    box("p2", 400, 80, { title: "a5f1c30", subtitle: "blob, delta against 9761654", w: 290, fill: GREEN, stroke: GREEN_DARK }),
    box("p3", 400, 150, { title: "39f6ea2", subtitle: "commit", w: 290 }),
    box("idx", 400, 260, { title: "pack-1e6609e.idx", subtitle: "hash -> offset in the .pack", w: 290, fill: "#ffffff", stroke: GREY }),
  ];
  render("packfile", shapes, []);
};


// Objects: how an object's name is derived from its content.
diagrams["object-hash"] = () => {
  const shapes = [
    box("header", 0, 0, { title: "header", rows: ["blob 20\\0"], fill: ORANGE, stroke: ORANGE_DARK, w: 200 }),
    box("content", 260, 0, { title: "content", rows: ["This is the readme.\\n"], fill: GREEN, stroke: GREEN_DARK, w: 260 }),
    box("bytes", 0, 130, { title: "bytes that get hashed", rows: ["blob 20\\0This is the readme.\\n"], fill: "#ffffff", stroke: GREY, w: 520 }),
    box("hash", 0, 250, { title: "SHA-1", rows: ["9761654c68d36874ac2184210502a0d2d116e817"], w: 520 }),
    box("path", 0, 370, { title: "stored at", rows: [".git/objects/97/61654c68d36874ac2184210502a0d2d116e817"], fill: "#ffffff", stroke: GREY, w: 520 }),
  ];
  const edges = [edge("header", "bytes"), edge("content", "bytes"), edge("bytes", "hash", { text: "shasum", textDx: 50, textDy: 12 }), edge("hash", "path", { text: "split after two characters", textDx: 125, textDy: 12 })];
  render("object-hash", shapes, edges);
};

// Objects: the four object types, and what points at what.
diagrams["object-types"] = () => {
  const W = 240;
  const shapes = [
    box("tag", 0, 0, { title: "f8e3dfc", subtitle: "tag", rows: ["object 39f6ea2", "tagger Joseph Wynn", "Tagged 1.0"], w: W }),
    box("commit", 0, 185, { title: "39f6ea2", subtitle: "commit", rows: ["tree 9d073fc", "author Joseph Wynn", "First commit"], w: W }),
    box("tree", 0, 370, { title: "9d073fc", subtitle: "tree", rows: ["blob 9761654 README"], w: W }),
    box("blob", 0, 510, { title: "9761654", subtitle: "blob", rows: ["This is the readme."], w: W, fill: GREEN, stroke: GREEN_DARK }),
    label("tagref", "refs/tags/1.0", 3.4, 67 / ROW, { mono: true }),
    label("HEAD", "HEAD", 3.4, 170 / ROW, { mono: true }),
    label("main", "refs/heads/main", 3.4, 252 / ROW, { mono: true }),
  ];
  const edges = [edge("tag", "commit"), edge("commit", "tree"), edge("tree", "blob"), edge("tagref", "tag"), edge("main", "commit"), edge("HEAD", "main")];
  render("object-types", shapes, edges);
};

// Tree objects: two snapshots share the subtree that didn't change.
diagrams["shared-subtrees"] = () => {
  const W = 240;
  const shapes = [
    box("c1", 0, 0, { title: "commit 1", rows: ["tree 292240e"], w: W }),
    box("c2", 520, 0, { title: "commit 2", rows: ["tree 8f1c0a2"], w: W }),
    box("t1", 0, 110, { title: "292240e", subtitle: "root tree", rows: ["blob 9761654 README", "tree 675bff7 src"], w: W }),
    box("t2", 520, 110, { title: "8f1c0a2", subtitle: "root tree", rows: ["blob a5f1c30 README", "tree 675bff7 src"], w: W }),
    box("r1", 0, 290, { title: "9761654", subtitle: "README", rows: ["This is the readme.", ""], w: W, fill: GREEN, stroke: GREEN_DARK }),
    box("src", 260, 290, { title: "675bff7", subtitle: "src (stored once)", rows: ["blob 032e1d1 hello.c", ""], w: W }),
    box("r2", 520, 290, { title: "a5f1c30", subtitle: "README", rows: ["This is the readme.", "Some more information."], w: W, fill: GREEN, stroke: GREEN_DARK }),
  ];
  const edges = [edge("c1", "t1"), edge("c2", "t2"), edge("t1", "r1"), edge("t2", "r2"), edge("t1", "src"), edge("t2", "src")];
  render("shared-subtrees", shapes, edges);
};

// Branches: committing moves the current branch and nothing else.
diagrams["branch-commit-before"] = () => {
  const shapes = [commit("A", 0, 1), commit("B", 1, 1),
    label("main", "main", 1, 2.2, { mono: true }), label("test", "test-branch", 1, 0, { mono: true }), label("HEAD", "HEAD", 1, -1, { mono: true })];
  render("branch-commit-before", shapes, [edge("B", "A"), edge("main", "B"), edge("test", "B"), edge("HEAD", "test")]);
};

diagrams["branch-commit-after"] = () => {
  const shapes = [commit("A", 0, 1), commit("B", 1, 1), commit("C", 2, 1),
    label("main", "main", 1, 2.2, { mono: true }), label("test", "test-branch", 2, 0, { mono: true }), label("HEAD", "HEAD", 2, -1, { mono: true })];
  render("branch-commit-after", shapes, [edge("B", "A"), edge("C", "B"), edge("main", "B"), edge("test", "C"), edge("HEAD", "test")]);
};

// Tags: a lightweight tag is a ref; an annotated tag is a ref to a tag object.
diagrams["tags"] = () => {
  const shapes = [
    label("light", "refs/tags/1.0-lightweight", 0, 0, { mono: true }),
    box("c1", 330, -30, { title: "39f6ea2", subtitle: "commit", rows: ["First commit"], w: 180 }),
    label("annot", "refs/tags/1.0", 0, 1.6, { mono: true }),
    box("tagobj", 250, 100, { title: "f8e3dfc", subtitle: "tag", rows: ["object 39f6ea2", "tagger Joseph Wynn", "Tagged 1.0"], w: 230 }),
    box("c2", 590, 118, { title: "39f6ea2", subtitle: "commit", rows: ["First commit"], w: 180 }),
  ];
  render("tags", shapes, [edge("light", "c1"), edge("annot", "tagobj"), edge("tagobj", "c2")]);
};

// Rebasing: --update-refs moves every branch in the stack.
diagrams["update-refs-before"] = () => {
  const shapes = [commit("D", 0, 1), commit("O", 1, 1), commit("K", 1, 0), commit("L", 2, 0), commit("M", 3, 0), commit("N", 4, 0),
    label("main", "main", 1, 2.2, { mono: true }), label("p1", "part-1", 2, -1, { mono: true }), label("p2", "part-2", 4, -1, { mono: true })];
  render("update-refs-before", shapes, [edge("O", "D"), edge("K", "D"), edge("L", "K"), edge("M", "L"), edge("N", "M"), edge("main", "O"), edge("p1", "L"), edge("p2", "N")]);
};

diagrams["update-refs-after"] = () => {
  const shapes = [commit("D", 0, 1), commit("O", 1, 1),
    commit("K", 1, 0, { ghost: true }), commit("L", 2, 0, { ghost: true }), commit("M", 3, 0, { ghost: true }), commit("N", 4, 0, { ghost: true }),
    commit("K2", 2, 1, { text: "K'" }), commit("L2", 3, 1, { text: "L'" }), commit("M2", 4, 1, { text: "M'" }), commit("N2", 5, 1, { text: "N'" }),
    label("main", "main", 1, 2.2, { mono: true }), label("p1", "part-1", 3, 2.2, { mono: true }), label("p2", "part-2", 5, 2.2, { mono: true })];
  const edges = [edge("O", "D"), edge("K", "D", { ghost: true }), edge("L", "K", { ghost: true }), edge("M", "L", { ghost: true }), edge("N", "M", { ghost: true }),
    edge("K2", "O"), edge("L2", "K2"), edge("M2", "L2"), edge("N2", "M2"), edge("main", "O"), edge("p1", "L2"), edge("p2", "N2")];
  render("update-refs-after", shapes, edges);
};

// Rebasing: --autosquash folds a fixup commit into the commit it fixes.
diagrams["fixup-before"] = () => {
  const shapes = [commit("D", 0, 1), commit("A", 1, 1), commit("B", 2, 1), commit("F", 3, 1, { text: "A*" }),
    label("main", "main", 0, 2.2, { mono: true }), label("wip", "wip", 3, 2.2, { mono: true }),
    label("an", "Add greeting", 1, 0), label("bn", "Add farewell", 2, 2.2), label("fn", "fixup! Add greeting", 3.2, 0)];
  render("fixup-before", shapes, [edge("A", "D"), edge("B", "A"), edge("F", "B"), edge("main", "D"), edge("wip", "F"),
    edge("an", "A", { dashed: true }), edge("bn", "B", { dashed: true }), edge("fn", "F", { dashed: true })]);
};

diagrams["fixup-after"] = () => {
  const shapes = [commit("D", 0, 1), commit("A", 1, 0, { ghost: true }), commit("B", 2, 0, { ghost: true }), commit("F", 3, 0, { ghost: true, text: "A*" }),
    commit("A2", 1, 1, { text: "A'" }), commit("B2", 2, 1, { text: "B'" }),
    label("main", "main", 0, 2.2, { mono: true }), label("wip", "wip", 2, 2.2, { mono: true })];
  render("fixup-after", shapes, [edge("A", "D", { ghost: true }), edge("B", "A", { ghost: true }), edge("F", "B", { ghost: true }),
    edge("A2", "D"), edge("B2", "A2"), edge("main", "D"), edge("wip", "B2")]);
};

// Pushing: a push copies objects and updates a ref on the remote.
diagrams["push-before"] = () => {
  const shapes = [
    region("origin (bare-repo)", -60, -70, 400, 160),
    label("rempty", "(no commits, no branches)", 1, 0, { ghost: true }),
    region("clone-of-bare-repo", -60, 140, 400, 200),
    commit("A", 0, 2.6, { text: "A" }),
    label("main", "refs/heads/main", 1.4, 2.6, { mono: true }),
  ];
  render("push-before", shapes, [edge("main", "A")]);
};
diagrams["push-after"] = () => {
  const shapes = [
    region("origin (bare-repo)", -60, -70, 400, 200),
    commit("rA", 0, 0, { text: "A" }),
    label("rmain", "refs/heads/main", 1.4, 0, { mono: true }),
    region("clone-of-bare-repo", -60, 190, 400, 260),
    commit("A", 0, 3.2, { text: "A" }),
    label("main", "refs/heads/main", 1.4, 3.2, { mono: true }),
    label("omain", "refs/remotes/origin/main", 1.6, 4.2, { mono: true }),
  ];
  render("push-after", shapes, [edge("rmain", "rA"), edge("main", "A"), edge("omain", "A"), edge("A", "rA", { dashed: true, text: "git push", textDx: 55, textDy: 20 })]);
};

// Pushing: --force-with-lease notices that the remote has moved.
diagrams["force-with-lease"] = () => {
  const shapes = [
    region("origin (bare-repo)", -60, -70, 520, 200),
    commit("rA", 0, 0, { text: "A" }), commit("rB", 1, 0, { text: "B" }),
    label("rfb", "refs/heads/feature-branch", 1.4, 0.9, { mono: true }),
    label("bn", "pushed by a colleague", 2.9, 0),
    region("your clone", -60, 200, 560, 300),
    commit("A", 0, 3.8, { text: "A", ghost: true }), commit("A2", 1, 3.8, { text: "A'" }),
    label("fb", "refs/heads/feature-branch", 1.4, 4.9, { mono: true }),
    label("ofb", "refs/remotes/origin/feature-branch (stale)", 2, 2.9, { mono: true }),
  ];
  const edges = [edge("rB", "rA"), edge("rfb", "rB"), edge("bn", "rB", { dashed: true }), edge("fb", "A2"), edge("ofb", "A")];
  render("force-with-lease", shapes, edges);
};

// Pulling: the same diverged history, reconciled by a merge or by a rebase.
diagrams["pull-diverged"] = () => {
  const shapes = [commit("A", 0, 1), commit("L", 1, 0), commit("R", 1, 2),
    label("main", "main", 2.2, 0, { mono: true }), label("omain", "origin/main", 2.4, 2, { mono: true })];
  render("pull-diverged", shapes, [edge("L", "A"), edge("R", "A"), edge("main", "L"), edge("omain", "R")]);
};
diagrams["pull-merge"] = () => {
  const shapes = [commit("A", 0, 1), commit("L", 1, 0), commit("R", 1, 2), commit("M", 2, 1),
    label("main", "main", 3.2, 1, { mono: true }), label("omain", "origin/main", 2.4, 2.8, { mono: true })];
  render("pull-merge", shapes, [edge("L", "A"), edge("R", "A"), edge("M", "L"), edge("M", "R"), edge("main", "M"), edge("omain", "R")]);
};
diagrams["pull-rebase"] = () => {
  const shapes = [commit("A", 0, 1), commit("L", 1, 0, { ghost: true }), commit("R", 1, 2), commit("L2", 2, 2, { text: "L'" }),
    label("main", "main", 3.2, 2, { mono: true }), label("omain", "origin/main", 1, 3.2, { mono: true })];
  render("pull-rebase", shapes, [edge("L", "A", { ghost: true }), edge("R", "A"), edge("L2", "R"), edge("main", "L2"), edge("omain", "R")]);
};

// Recovering lost commits: the reflog remembers where HEAD has been.
diagrams["reflog-timeline"] = () => {
  const entries = [
    ["HEAD@{0}: reset: moving to HEAD~2", "B", false],
    ["HEAD@{1}: commit: Add empty LICENSE file", "D", true],
    ["HEAD@{2}: commit: Add some actual content", "C", true],
    ["HEAD@{3}: commit: Add TODO note", "B", false],
    ["HEAD@{4}: commit (initial): Add empty readme", "A", false],
  ];
  const shapes = [
    label("hist", "the history", 1.5, -1.2, { plain: true }),
    commit("A", 0, 0), commit("B", 1, 0), commit("C", 2, 0, { ghost: true }), commit("D", 3, 0, { ghost: true }),
    label("main", "main", 1, 1, { mono: true }),
    label("rl", "the reflog", 1.5, 2.2, { plain: true }),
  ];
  const edges = [edge("B", "A"), edge("C", "B", { ghost: true }), edge("D", "C", { ghost: true }), edge("main", "B")];
  entries.forEach(([text, letter, ghost], i) => {
    const row = 3 + i * 0.85;
    const width = text.length * 18 * 0.62 + 24;
    shapes.push(label("e" + i, text, (3.3 * COL - width / 2) / COL, row, { mono: true }), commit("k" + i, 4.1, row, { text: letter, ghost }));
    edges.push(edge("e" + i, "k" + i, { dashed: true }));
  });
  render("reflog-timeline", shapes, edges);
};

diagrams["dangling-commit"] = () => {
  const shapes = [commit("A", 0, 1), commit("B", 1, 1), commit("C", 2, 1), commit("D", 3, 0, { ghost: true }),
    label("main", "main", 2, 2.2, { mono: true }), label("fb", "feature-branch (deleted)", 3, -1, { mono: true, ghost: true })];
  render("dangling-commit", shapes, [edge("B", "A"), edge("C", "B"), edge("D", "C", { ghost: true }), edge("main", "C"), edge("fb", "D", { ghost: true })]);
};

// Bisecting: each answer halves the range.
diagrams["bisect"] = () => {
  const steps = [
    { test: 6, good: [0], bad: [12] },
    { test: 9, good: [0, 1, 2, 3, 4, 5, 6], bad: [12] },
    { test: 8, good: [0, 1, 2, 3, 4, 5, 6], bad: [9, 10, 11, 12] },
    { test: 7, good: [0, 1, 2, 3, 4, 5, 6], bad: [8, 9, 10, 11, 12] },
  ];
  const X = 0.68;
  const shapes = [];
  const edges = [];
  steps.forEach((st, row) => {
    for (let i = 0; i <= 12; i++) {
      const fill = st.good.includes(i) ? GREEN : st.bad.includes(i) ? ORANGE : BLUE;
      shapes.push(commit("c" + row + "_" + i, i * X, row * 1.4, { text: String(i), fill }));
      if (i > 0) edges.push(edge("c" + row + "_" + i, "c" + row + "_" + (i - 1)));
    }
    shapes.push(label("t" + row, `step ${row + 1}: test ${st.test}`, st.test * X, row * 1.4 - 0.7));
    edges.push(edge("t" + row, "c" + row + "_" + st.test, { dashed: true }));
  });
  shapes.push(commit("lg", 0.3 * X, 5.2, { text: "", fill: GREEN }), label("lgt", "known good", 2.2 * X, 5.2));
  shapes.push(commit("lb", 5.2 * X, 5.2, { text: "", fill: ORANGE }), label("lbt", "known bad", 7 * X, 5.2));
  shapes.push(commit("lu", 10 * X, 5.2, { text: "", fill: BLUE }), label("lut", "untested", 11.6 * X, 5.2));
  render("bisect", shapes, edges);
};

// Merging: where each section of a zdiff3 conflict comes from.
diagrams["conflict-three-way"] = () => {
  const W = 300;
  const shapes = [
    box("ours", 0, 0, { title: "ours (main)", rows: ["<h1>Welcome, friend</h1>", "<p>This is our web site.</p>"], w: W }),
    box("base", 0, 120, { title: "merge base (fa2639d)", rows: ["<h1>Welcome</h1>", "<p>This is our website.</p>"], w: W, fill: "#ffffff", stroke: GREY }),
    box("theirs", 0, 240, { title: "theirs (conflicting-branch)", rows: ["<h1>Welcome!</h1>", "<p>This is our website.</p>"], w: W, fill: GREEN, stroke: GREEN_DARK }),
    box("m1", 420, 0, { title: "<<<<<<< HEAD", rows: ["<h1>Welcome, friend</h1>", "<p>This is our web site.</p>"], w: W }),
    box("m2", 420, 90, { title: "||||||| fa2639d", rows: ["<h1>Welcome</h1>", "<p>This is our website.</p>"], w: W, fill: "#ffffff", stroke: GREY }),
    box("m3", 420, 180, { title: "=======", rows: ["<h1>Welcome!</h1>", "<p>This is our website.</p>"], w: W, fill: GREEN, stroke: GREEN_DARK }),
    box("m4", 420, 270, { title: ">>>>>>> conflicting-branch", rows: [], w: W, fill: "#ffffff", stroke: GREY }),
    label("cap", "index.html, as Git leaves it", 5.2, -0.55, { plain: true }),
    label("cap2", "the three versions Git compared", 1.36, -0.55, { plain: true }),
  ];
  const edges = [edge("ours", "m1"), edge("base", "m2"), edge("theirs", "m3")];
  render("conflict-three-way", shapes, edges, 30);
};

// Repositories: what lives where inside .git.
diagrams["git-directory"] = () => {
  const shapes = [
    region(".git/", -20, -40, 420, 560),
    box("objects", 0, 0, { title: "objects/", subtitle: "every blob, tree, commit and tag", w: 380 }),
    box("refs", 0, 85, { title: "refs/", subtitle: "branches, tags, remote-tracking branches", w: 380 }),
    box("head", 0, 170, { title: "HEAD", subtitle: "which branch is checked out", w: 380, fill: "#ffffff", stroke: GREY }),
    box("index", 0, 255, { title: "index", subtitle: "the staging area", w: 380, fill: ORANGE, stroke: ORANGE_DARK }),
    box("logs", 0, 340, { title: "logs/", subtitle: "the reflog", w: 380, fill: "#ffffff", stroke: GREY }),
    box("config", 0, 425, { title: "config", subtitle: "this repository's settings and remotes", w: 380, fill: "#ffffff", stroke: GREY }),
  ];
  render("git-directory", shapes, []);
};

// References: the names a commit can have.
diagrams["revision-graph"] = () => {
  const shapes = [commit("A", 0, 1), commit("B", 1, 1), commit("C", 2, 1), commit("D", 3, 1), commit("E", 3, 0), commit("M", 4, 1),
    label("main", "main", 5.2, 1, { mono: true }), label("topic", "topic", 4.2, 0, { mono: true }), label("HEAD", "HEAD", 5.2, 0, { mono: true }),
    label("nD", "HEAD~1  HEAD^1", 3.6, 2.2, { mono: true }), label("nE", "HEAD^2", 2.2, -0.6, { mono: true }), label("nC", "HEAD~2  HEAD^2~1", 1.3, 2.2, { mono: true })];
  const edges = [edge("B", "A"), edge("C", "B"), edge("D", "C"), edge("E", "C"), edge("M", "D"), edge("M", "E"),
    edge("main", "M"), edge("topic", "E"), edge("HEAD", "main"), edge("nD", "D", { dashed: true }), edge("nE", "E", { dashed: true }), edge("nC", "C", { dashed: true })];
  render("revision-graph", shapes, edges);
};

for (const [name, fn] of Object.entries(diagrams)) fn();
