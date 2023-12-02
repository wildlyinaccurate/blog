import { Prism } from "tinacms/dist/rich-text/prism";
import { tinaField } from "tinacms/dist/react";
import { TinaMarkdown } from "tinacms/dist/rich-text";
import { Layout } from "./Layout";
import Link from "next/link";

const components = {
  code_block: (props) => <Prism theme="vsLight" {...props} />,
  ScriptEmbed: (props) => <script async {...props} />,
  CarbonAd: () => (
    <script
      async
      src="https://cdn.carbonads.com/carbon.js?serve=CKYIKK3U&placement=wildlyinaccuratecom"
      id="_carbonads_js"
    />
  ),
};

export const Post = (props) => {
  const { post } = props;

  return (
    <Layout title={post.title}>
      {post.parent && (
        <Link href={post.parent._sys.breadcrumbs.join("/")}>
          <a>
            &larr; Back to <i>{post.parent.title}</i>
          </a>
        </Link>
      )}
      <h2 data-tina-field={tinaField(post, "title")}>{post.title}</h2>
      <div data-tina-field={tinaField(post, "body")}>
        <TinaMarkdown content={post.body} components={components} />
      </div>
    </Layout>
  );
};
