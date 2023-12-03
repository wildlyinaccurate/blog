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

export const getStaticPaths = getStaticPathsForPostOrPage(
  (x) => x.node._sys.filename,
  (x) => x.node._sys.breadcrumbs.length === 1
);
export const getStaticProps = getStaticPropsForPostOrPage(
  (filename) => `${filename}.mdx`
);

export function getStaticPathsForPostOrPage(
  getFilenameParam,
  filterEdges = () => true
) {
  return async function getStaticPaths() {
    const postsQuery = await client.queries.postConnection();
    const pagesQuery = await client.queries.pageConnection();

    const edges = [
      ...postsQuery.data.postConnection.edges,
      ...pagesQuery.data.pageConnection.edges,
    ];

    const paths = edges.filter(filterEdges).map((x) => {
      return {
        params: {
          filename: getFilenameParam(x),
        },
      };
    });

    return {
      paths,
      fallback: "blocking",
    };
  };
}

export function getStaticPropsForPostOrPage(makeRelativePath) {
  return async function getStaticProps({ params }) {
    const relativePath = makeRelativePath(params.filename);
    const { data, query, variables } = await client.queries
      .post({
        relativePath,
      })
      .catch(() => {
        return client.queries.page({
          relativePath,
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
}
