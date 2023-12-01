import { Layout } from "../components/Layout";
import { TinaMarkdown } from "tinacms/dist/rich-text";
import { tinaField } from "tinacms/dist/react";

export const Post = (props) => {
  const { post } = props;

  return (
    <Layout title={post.title}>
      <h2 data-tina-field={tinaField(post, "title")}>{post.title}</h2>
      <div data-tina-field={tinaField(post, "body")}>
        <TinaMarkdown content={post.body} />
      </div>
    </Layout>
  );
};
