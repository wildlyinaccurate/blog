import { useMemo, useState } from "react";
import { Graph } from "./graph";
import { actions, createRepo, describeRefs, headCommit, layout, short } from "./model";
import { Widget } from "./Widget";

const A = { letter: "A", message: "Initial commit" };

// Each scenario reproduces the history at the point where its chapter picks up.
const scenarios = {
  branches: {
    title: "Branch playground",
    commits: [A, { letter: "B", parents: ["A"], message: "First commit" }],
    refs: { main: "B", "test-branch": "B" },
    head: "test-branch",
  },
  merging: {
    title: "Merge playground",
    commits: [A, { letter: "B", parents: ["A"], message: "Finished the new feature" }, { letter: "C", parents: ["A"], message: "Fixed some wording" }],
    refs: { main: "A", "feature-branch": "B", hotfix: "C" },
    head: "main",
  },
  "cherry-picking": {
    title: "Cherry-pick playground",
    commits: [A, { letter: "B", parents: ["A"] }, { letter: "C", parents: ["B"] }, { letter: "D", parents: ["C"] }, { letter: "E", parents: ["B"] }, { letter: "F", parents: ["E"] }],
    refs: { main: "F", foo: "D" },
    head: "foo",
  },
  rebasing: {
    title: "Rebase playground",
    commits: [A, { letter: "B", parents: ["A"] }, { letter: "C", parents: ["B"] }, { letter: "D", parents: ["C"] }, { letter: "E", parents: ["B"] }, { letter: "F", parents: ["E"] }],
    refs: { main: "F", foo: "D" },
    head: "foo",
  },
  stashing: {
    title: "Stash playground",
    commits: [A],
    refs: { main: "A" },
    head: "main",
  },
};

export function GitPlayground({ scenario = "merging" }) {
  const spec = scenarios[scenario] || scenarios.merging;
  const initial = useMemo(() => createRepo(spec), [scenario]);
  const [history, setHistory] = useState([{ state: initial, command: null, output: "" }]);
  const [branchName, setBranchName] = useState("new-branch");
  const [targets, setTargets] = useState({});

  const current = history[history.length - 1];
  const state = current.state;
  const branches = state.refOrder;
  const commits = state.order.filter((id) => state.commits[id]);
  const head = headCommit(state);

  const run = (command, fn) => {
    const { state: next, output } = fn(state);
    setHistory([...history, { state: next, command, output }]);
  };
  const undo = () => history.length > 1 && setHistory(history.slice(0, -1));
  const reset = () => setHistory([{ state: initial, command: null, output: "" }]);
  const target = (key, fallbackValue) => targets[key] ?? fallbackValue;
  const setTarget = (key) => (e) => setTargets({ ...targets, [key]: e.target.value });
  const otherBranches = branches.filter((b) => b !== state.head.branch);

  const { shapes, edges } = layout(state);

  return (
    <Widget title={spec.title}>
      <div className="hg-toolbar">
        <button onClick={() => run("git commit", (s) => actions.commit(s))}>git commit</button>
        <span className="hg-group">
          <button onClick={() => run(`git branch ${branchName}`, (s) => actions.branch(s, branchName))}>git branch</button>
          <input value={branchName} onChange={(e) => setBranchName(e.target.value.replace(/[^\w.-]/g, ""))} size="10" aria-label="branch name" />
        </span>
        <span className="hg-group">
          <button onClick={() => run(`git switch ${target("switch", otherBranches[0])}`, (s) => actions.switch(s, target("switch", otherBranches[0])))} disabled={!otherBranches.length}>git switch</button>
          <select value={target("switch", otherBranches[0] || "")} onChange={setTarget("switch")} aria-label="branch to switch to">
            {otherBranches.map((b) => <option key={b}>{b}</option>)}
          </select>
        </span>
        <span className="hg-group">
          <button onClick={() => run(`git branch -D ${target("delete", otherBranches[0])}`, (s) => actions.deleteBranch(s, target("delete", otherBranches[0])))} disabled={!otherBranches.length}>git branch -D</button>
          <select value={target("delete", otherBranches[0] || "")} onChange={setTarget("delete")} aria-label="branch to delete">
            {otherBranches.map((b) => <option key={b}>{b}</option>)}
          </select>
        </span>
      </div>
      <div className="hg-toolbar">
        <span className="hg-group">
          <button onClick={() => run(`git merge ${target("merge", otherBranches[0])}`, (s) => actions.merge(s, target("merge", otherBranches[0])))} disabled={!otherBranches.length}>git merge</button>
          <select value={target("merge", otherBranches[0] || "")} onChange={setTarget("merge")} aria-label="branch to merge">
            {otherBranches.map((b) => <option key={b}>{b}</option>)}
          </select>
        </span>
        <span className="hg-group">
          <button onClick={() => run(`git rebase ${target("rebase", otherBranches[0])}`, (s) => actions.rebase(s, target("rebase", otherBranches[0])))} disabled={!otherBranches.length}>git rebase</button>
          <select value={target("rebase", otherBranches[0] || "")} onChange={setTarget("rebase")} aria-label="branch to rebase onto">
            {otherBranches.map((b) => <option key={b}>{b}</option>)}
          </select>
        </span>
        <span className="hg-group">
          <button onClick={() => run(`git cherry-pick ${short(state, target("pick", commits[0]))}`, (s) => actions.cherryPick(s, target("pick", commits[0])))}>git cherry-pick</button>
          <select value={target("pick", commits[0])} onChange={setTarget("pick")} aria-label="commit to cherry-pick">
            {commits.map((id) => <option key={id} value={id}>{short(state, id)}</option>)}
          </select>
        </span>
        <span className="hg-group">
          <button onClick={() => run(`git reset --hard ${short(state, target("reset", commits[0]))}`, (s) => actions.resetHard(s, target("reset", commits[0])))}>git reset --hard</button>
          <select value={target("reset", commits[0])} onChange={setTarget("reset")} aria-label="commit to reset to">
            {commits.map((id) => <option key={id} value={id}>{short(state, id)}</option>)}
          </select>
        </span>
      </div>
      <div className="hg-toolbar">
        <button onClick={() => run("git stash", (s) => actions.stash(s))}>git stash</button>
        <button onClick={() => run("git stash pop", (s) => actions.stashPop(s))} disabled={!state.stash.length}>git stash pop</button>
        <button onClick={() => run("git gc --prune=now", (s) => actions.gc(s))}>git gc --prune=now</button>
        <span className="hg-spacer" />
        <button onClick={undo} disabled={history.length < 2}>undo</button>
        <button onClick={reset} disabled={history.length < 2}>reset</button>
      </div>
      <div className="hg-graph-wrap">
        <Graph shapes={shapes} edges={edges} selected={head} />
      </div>
      <div className="hg-panels">
        <pre className="hg-output">{current.command ? `$ ${current.command}\n${current.output}` : "(run a command to see its output here)"}</pre>
        <pre className="hg-output">{describeRefs(state)}</pre>
      </div>
    </Widget>
  );
}
