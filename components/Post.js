import { CodeBlock } from "./CodeBlock";
import { Layout } from "./Layout";
import { TinaMarkdown } from "tinacms/dist/rich-text";
import { tinaField } from "tinacms/dist/react";

const components = {
  CodeBlock,
  ScriptEmbed: (props) => <script async src={props.src}></script>,
};

export const Post = (props) => {
  const { post } = props;

  return (
    <Layout title={post.title}>
      <h2 data-tina-field={tinaField(post, "title")}>{post.title}</h2>
      <div data-tina-field={tinaField(post, "body")}>
        <TinaMarkdown content={post.body} components={components} />
      </div>
    </Layout>
  );
};
