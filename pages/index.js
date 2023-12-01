import format from "date-fns/format";
import Link from "next/link";
import { useTina } from "tinacms/dist/react";
import { Layout } from "../components/Layout";
import { client } from "../tina/__generated__/client";

export default function Home(props) {
  const { data } = useTina({
    query: props.query,
    variables: props.variables,
    data: props.data,
  });
  const postsList = data.postConnection.edges;
  const today = new Date();
  const formatDate = (date) => {
    if (date.getYear() === today.getYear()) {
      return format(date, "d MMM");
    }

    return format(date, "d MMM yyyy");
  };

  return (
    <Layout>
      <h2>Posts</h2>
      <ul className="posts-list">
        {postsList.map((post) => (
          <li key={post.node.id}>
            <Link href={post.node._sys.filename}>
              <a>{post.node.title}</a>
            </Link>{" "}
            <span className="post-date">
              ({formatDate(new Date(post.node.created_at))})
            </span>
          </li>
        ))}
      </ul>
    </Layout>
  );
}

export const getStaticProps = async () => {
  const { data, query, variables } = await client.queries.postConnection({
    sort: "created_at",
    last: -1,
  });

  return {
    props: {
      data,
      query,
      variables,
    },
  };
};
