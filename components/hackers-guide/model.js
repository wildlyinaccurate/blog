// A tiny in-memory model of a Git repository: commits with parents, refs,
// HEAD and a stash. Enough to demonstrate what the porcelain commands do to
// the graph, and nothing more. There are no files, so nothing can conflict.

import { COL, ROW } from "./graph";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function createRepo(spec) {
  const state = { commits: {}, order: [], refs: {}, refOrder: [], head: { branch: null }, stash: [], seq: 0, letters: 0 };
  const ids = {};
  for (const c of spec.commits) {
    const id = "c" + ++state.seq;
    ids[c.letter] = id;
    state.commits[id] = { id, letter: c.letter, parents: (c.parents || []).map((p) => ids[p]), message: c.message || c.letter };
    state.order.push(id);
    state.letters = Math.max(state.letters, LETTERS.indexOf(c.letter) + 1);
  }
  for (const [name, letter] of Object.entries(spec.refs)) setRef(state, name, ids[letter]);
  state.head = spec.detached ? { detached: ids[spec.detached] } : { branch: spec.head };
  return state;
}

function clone(state) {
  return {
    ...state,
    commits: Object.fromEntries(Object.entries(state.commits).map(([k, v]) => [k, { ...v, parents: [...v.parents] }])),
    order: [...state.order],
    refs: { ...state.refs },
    refOrder: [...state.refOrder],
    head: { ...state.head },
    stash: [...state.stash],
  };
}

function setRef(state, name, id) {
  if (!(name in state.refs)) state.refOrder.push(name);
  state.refs[name] = id;
}

export const headCommit = (s) => (s.head.branch ? s.refs[s.head.branch] : s.head.detached);
export const short = (s, id) => s.commits[id].letter;

function nextLetter(state) {
  const letter = LETTERS[state.letters % LETTERS.length] + (state.letters >= LETTERS.length ? "2" : "");
  state.letters++;
  return letter;
}

function addCommit(state, { letter, parents, message }) {
  const id = "c" + ++state.seq;
  state.commits[id] = { id, letter, parents, message };
  state.order.push(id);
  return id;
}

function moveHead(state, id) {
  if (state.head.branch) state.refs[state.head.branch] = id;
  else state.head.detached = id;
}

export function reachable(state, roots) {
  const seen = new Set();
  const stack = [...roots].filter(Boolean);
  while (stack.length) {
    const id = stack.pop();
    if (seen.has(id)) continue;
    seen.add(id);
    stack.push(...state.commits[id].parents);
  }
  return seen;
}

export const isAncestor = (s, a, b) => reachable(s, [b]).has(a);

export function depth(state, id, memo = {}) {
  if (memo[id] != null) return memo[id];
  const c = state.commits[id];
  memo[id] = c.parents.length ? 1 + Math.max(...c.parents.map((p) => depth(state, p, memo))) : 0;
  return memo[id];
}

// Commits reachable from `tip` but not from `base`, oldest first, merges left out.
function commitsToReplay(state, base, tip) {
  const exclude = reachable(state, [base]);
  const memo = {};
  return [...reachable(state, [tip])]
    .filter((id) => !exclude.has(id) && state.commits[id].parents.length < 2)
    .sort((a, b) => depth(state, a, memo) - depth(state, b, memo));
}

const prime = (letter) => letter + "'";
const headName = (s) => (s.head.branch ? s.head.branch : "detached HEAD");

// Every action returns { state, output } where output mimics Git's terminal output.
export const actions = {
  commit(prev, message) {
    const state = clone(prev);
    const letter = nextLetter(state);
    const id = addCommit(state, { letter, parents: [headCommit(state)], message: message || letter });
    moveHead(state, id);
    return { state, output: `[${headName(state)} ${letter}] ${state.commits[id].message}` };
  },

  branch(prev, name) {
    if (!name) return { state: prev, output: "fatal: branch name required" };
    if (name in prev.refs) return { state: prev, output: `fatal: a branch named '${name}' already exists` };
    const state = clone(prev);
    setRef(state, name, headCommit(state));
    return { state, output: "" };
  },

  switch(prev, name) {
    if (!(name in prev.refs)) return { state: prev, output: `fatal: invalid reference: ${name}` };
    const state = clone(prev);
    state.head = { branch: name };
    return { state, output: `Switched to branch '${name}'` };
  },

  detach(prev, id) {
    const state = clone(prev);
    state.head = { detached: id };
    return { state, output: `HEAD is now at ${short(state, id)} ${state.commits[id].message}` };
  },

  deleteBranch(prev, name) {
    if (prev.head.branch === name) return { state: prev, output: `error: cannot delete branch '${name}' used by worktree` };
    const state = clone(prev);
    const was = short(state, state.refs[name]);
    delete state.refs[name];
    state.refOrder = state.refOrder.filter((n) => n !== name);
    return { state, output: `Deleted branch ${name} (was ${was}).` };
  },

  merge(prev, name) {
    const target = prev.refs[name];
    const head = headCommit(prev);
    if (target === head || isAncestor(prev, target, head)) return { state: prev, output: "Already up to date." };
    const state = clone(prev);
    if (isAncestor(state, head, target)) {
      moveHead(state, target);
      return { state, output: `Updating ${short(state, head)}..${short(state, target)}\nFast-forward` };
    }
    const letter = nextLetter(state);
    const id = addCommit(state, { letter, parents: [head, target], message: `Merge branch '${name}'` });
    moveHead(state, id);
    return { state, output: `Merge made by the 'ort' strategy.` };
  },

  rebase(prev, name) {
    const onto = prev.refs[name];
    const head = headCommit(prev);
    if (isAncestor(prev, head, onto)) {
      const state = clone(prev);
      moveHead(state, onto);
      return { state, output: `Successfully rebased and updated ${refName(state)}.` };
    }
    const todo = commitsToReplay(prev, onto, head);
    if (!todo.length) return { state: prev, output: `Current branch ${headName(prev)} is up to date.` };
    const state = clone(prev);
    let parent = onto;
    for (const id of todo) {
      const c = state.commits[id];
      parent = addCommit(state, { letter: prime(c.letter), parents: [parent], message: c.message });
    }
    moveHead(state, parent);
    return { state, output: `Successfully rebased and updated ${refName(state)}.` };
  },

  cherryPick(prev, id) {
    const state = clone(prev);
    const c = state.commits[id];
    const nid = addCommit(state, { letter: prime(c.letter), parents: [headCommit(state)], message: c.message });
    moveHead(state, nid);
    return { state, output: `[${headName(state)} ${short(state, nid)}] ${c.message}` };
  },

  resetHard(prev, id) {
    const state = clone(prev);
    moveHead(state, id);
    return { state, output: `HEAD is now at ${short(state, id)} ${state.commits[id].message}` };
  },

  stash(prev) {
    const state = clone(prev);
    const head = headCommit(state);
    const label = `${headName(state)}: ${short(state, head)} ${state.commits[head].message}`;
    const index = addCommit(state, { letter: "I" + (state.stash.length + 1), parents: [head], message: `index on ${label}` });
    const wip = addCommit(state, { letter: "W" + (state.stash.length + 1), parents: [head, index], message: `WIP on ${label}` });
    state.stash.unshift(wip);
    return { state, output: `Saved working directory and index state WIP on ${label}` };
  },

  stashPop(prev) {
    if (!prev.stash.length) return { state: prev, output: "No stash entries found." };
    const state = clone(prev);
    const wip = state.stash.shift();
    return { state, output: `Dropped refs/stash@{0} (${short(state, wip)})` };
  },

  gc(prev) {
    const keep = reachable(prev, [...Object.values(prev.refs), headCommit(prev), ...prev.stash]);
    const state = clone(prev);
    const gone = state.order.filter((id) => !keep.has(id));
    for (const id of gone) delete state.commits[id];
    state.order = state.order.filter((id) => keep.has(id));
    return { state, output: gone.length ? `Removed ${gone.length} unreachable commit${gone.length > 1 ? "s" : ""}.` : "Nothing to prune." };
  },
};

const refName = (s) => (s.head.branch ? `refs/heads/${s.head.branch}` : "detached HEAD");

// The contents of .git/HEAD and .git/refs, for the "peek inside" panel.
export function describeRefs(state) {
  const lines = [];
  lines.push(`$ cat .git/HEAD`);
  lines.push(state.head.branch ? `ref: refs/heads/${state.head.branch}` : `${short(state, state.head.detached)} (detached)`);
  lines.push("");
  lines.push(`$ git for-each-ref`);
  for (const name of state.refOrder) lines.push(`${short(state, state.refs[name])} commit\trefs/heads/${name}`);
  state.stash.forEach((id, i) => lines.push(`${short(state, id)} commit\trefs/stash${i ? `@{${i}}` : ""}`));
  return lines.join("\n");
}

// Assign each commit a column (its depth) and a lane, then place labels.
export function layout(state, { fills = {} } = {}) {
  const keep = reachable(state, [...Object.values(state.refs), headCommit(state), ...state.stash]);
  const memo = {};
  const lane = {};
  const lanes = [];

  const walk = (tip) => {
    let id = tip;
    while (id && lane[id] == null) {
      lane[id] = lanes.length - 1;
      id = state.commits[id].parents[0];
    }
  };
  const tips = [];
  if (state.head.branch) tips.push(state.refs[state.head.branch]);
  for (const name of state.refOrder) tips.push(state.refs[name]);
  if (state.head.detached) tips.push(state.head.detached);
  tips.push(...state.stash);
  for (const tip of tips) if (lane[tip] == null) { lanes.push(tip); walk(tip); }
  const rest = [...state.order].filter((id) => lane[id] == null).sort((a, b) => depth(state, b, memo) - depth(state, a, memo));
  for (const id of rest) if (lane[id] == null) { lanes.push(id); walk(id); }

  const rowFor = (l) => (l === 0 ? 0 : l % 2 ? -Math.ceil(l / 2) : Math.ceil(l / 2));
  const shapes = [];
  const edges = [];
  for (const id of state.order) {
    const c = state.commits[id];
    shapes.push({ kind: "circle", id, x: depth(state, id, memo) * COL, y: rowFor(lane[id]) * ROW, text: c.letter, ghost: !keep.has(id), fill: fills[id] });
    for (const p of c.parents) if (state.commits[p]) edges.push({ from: id, to: p, ghost: !keep.has(id) });
  }

  // Labels sit on the side of the commit away from the middle lane. Several
  // branches on one commit line up side by side; HEAD sits beyond its branch.
  const placed = {};
  const occupied = new Set(state.order.map((id) => `${depth(state, id, memo)},${rowFor(lane[id])}`));
  const labelWidth = (text) => text.length * 18 * 0.62 + 24;
  const place = (targetId, text, opts = {}) => {
    const row = rowFor(lane[targetId]);
    const col = depth(state, targetId, memo);
    // Put the label on the side away from the middle lane, unless a commit
    // is already there.
    let dir = row > 0 ? 1 : -1;
    if (occupied.has(`${col},${row + dir}`) && !occupied.has(`${col},${row - dir}`)) dir = -dir;
    const lid = "l" + text.replace(/[^a-z0-9]/gi, "_") + (opts.suffix || "");
    const list = (placed[targetId] = placed[targetId] || []);
    let x = depth(state, targetId, memo) * COL;
    let y = (row + dir * 0.9) * ROW;
    let to = targetId;
    if (opts.beside) {
      const last = list[list.length - 1];
      x = last.x + labelWidth(last.text) / 2 + 12 + labelWidth(text) / 2;
    } else if (opts.beyond) {
      x = opts.beyond.x;
      y = opts.beyond.y + dir * 0.6 * ROW;
      to = opts.beyond.id;
    }
    const shape = { kind: "label", id: lid, x, y, text, mono: true, highlight: !!opts.highlight };
    shapes.push(shape);
    edges.push({ from: lid, to });
    if (!opts.beyond) list.push(shape);
    return shape;
  };
  for (const name of state.refOrder) {
    const target = state.refs[name];
    const label = place(target, name, { beside: (placed[target] || []).length > 0 });
    if (state.head.branch === name) place(target, "HEAD", { beyond: label, highlight: true, suffix: "_head" });
  }
  if (state.head.detached) place(state.head.detached, "HEAD", { beside: (placed[state.head.detached] || []).length > 0, highlight: true });
  state.stash.forEach((id, i) => place(id, i ? `stash@{${i}}` : "refs/stash", { beside: (placed[id] || []).length > 0 }));
  return { shapes, edges };
}
