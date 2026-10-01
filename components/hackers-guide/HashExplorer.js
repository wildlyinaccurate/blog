import { useEffect, useState } from "react";
import { sha1 } from "./sha1";
import { Widget } from "./Widget";

export function HashExplorer() {
  const [text, setText] = useState("This is the readme.\n");
  const [hash, setHash] = useState("");

  const bytes = new TextEncoder().encode(text).length;
  const header = `blob ${bytes}\\0`;

  useEffect(() => {
    let cancelled = false;
    sha1(`blob ${bytes}\0${text}`).then((h) => !cancelled && setHash(h));
    return () => { cancelled = true; };
  }, [text, bytes]);

  const visible = text.replace(/\n/g, "\\n");

  return (
    <Widget title="Hash explorer">
      <textarea className="hg-textarea" value={text} onChange={(e) => setText(e.target.value)} rows={3} spellCheck={false} aria-label="file contents" />
      <pre className="hg-output">
        {`header    ${header}\n`}
        {`content   ${visible}\n`}
        {`hashed    ${header}${visible}\n`}
        {`sha1      ${hash || "…"}\n`}
        {`stored at .git/objects/${hash ? `${hash.slice(0, 2)}/${hash.slice(2)}` : "…"}`}
      </pre>
    </Widget>
  );
}
