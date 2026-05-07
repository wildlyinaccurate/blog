import { client } from "../tina/__generated__/client";

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

    const paths = edges.filter(filterEdges).map((x) => ({
      params: {
        filename: getFilenameParam(x),
      },
    }));

    return {
      paths,
      fallback: false,
    };
  };
}

export function getStaticPropsForPostOrPage(makeRelativePath) {
  return async function getStaticProps({ params }) {
    const relativePath = makeRelativePath(params.filename);
    const { data, query, variables } = await client.queries
      .post({ relativePath })
      .catch(() =>
        client.queries.page({ relativePath })
      );

    return {
      props: {
        data,
        query,
        variables,
      },
    };
  };
}
