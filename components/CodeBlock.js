import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import style from "react-syntax-highlighter/dist/cjs/styles/prism/material-dark";

export const CodeBlock = (props) => {
  const { children, language } = props;

  return (
    <SyntaxHighlighter
      code={children || ""}
      language={language || "text"}
      style={style}
    />
  );
};
