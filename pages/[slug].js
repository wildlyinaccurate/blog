import { useTina } from "tinacms/dist/react";
import { Page } from "../components/Page";
import { Post } from "../components/Post";
import { client } from "../tina/__generated__/client";

export default function PageOrPost(props) {
  const { data } = useTina({
    query: props.query,
    variables: props.variables,
    data: props.data,
  });

  if (data.post) {
    return <Post post={data.post} />;
  } else if (data.page) {
    return <Page page={data.page} />;
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
      relativePath: `${params.slug}.mdx`,
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
