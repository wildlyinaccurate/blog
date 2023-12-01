import { Layout } from "../components/Layout";
import { TinaMarkdown } from "tinacms/dist/rich-text";
import { tinaField, useTina } from "tinacms/dist/react";
import { client } from "../tina/__generated__/client";

export default function PageOrPost(props) {
  const { data } = useTina({
    query: props.query,
    variables: props.variables,
    data: props.data,
  });

  if (data.post) {
    const post = data.post;

    return (
      <Layout title={post.title}>
        <h2 data-tina-field={tinaField(post, "title")}>{post.title}</h2>
        <div data-tina-field={tinaField(post, "body")}>
          <TinaMarkdown content={post.body} />
          <code>
            <pre
              style={{
                backgroundColor: "lightgray",
              }}
            >
              {JSON.stringify(post, null, 2)}
            </pre>
          </code>
        </div>
      </Layout>
    );
  } else if (data.page) {
    const page = data.page;

    return (
      <Layout title={page.title}>
        <div data-tina-field={tinaField(page, "body")}>
          <TinaMarkdown content={page.body} />
        </div>
      </Layout>
    );
  }

  return "Not Found";
}

export const getStaticPaths = async () => {
  const postsQuery = await client.queries.postConnection();
  const pagesQuery = await client.queries.pageConnection();

  const edges = [
    ...postsQuery.data.postConnection.edges,
    ...pagesQuery.data.pageConnection.edges,
  ];

  const paths = edges.map((x) => {
    return { params: { slug: x.node._sys.filename } };
  });

  return {
    paths,
    fallback: "blocking",
  };
};

export const getStaticProps = async ({ params }) => {
  const { data, query, variables } = await client.queries
    .post({
      relativePath: `${params.slug}.md`,
    })
    .catch(() => {
      return client.queries.page({
        relativePath: `${params.slug}.mdx`,
      });
    });

  return {
    props: {
      data,
      query,
      variables,
    },
  };
};
