import { Prism } from "tinacms/dist/rich-text/prism";
import { tinaField } from "tinacms/dist/react";
import { TinaMarkdown } from "tinacms/dist/rich-text";
import { Layout } from "./Layout";

const components = {
  code_block: Prism,
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
