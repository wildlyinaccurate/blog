import { useTina } from "tinacms/dist/react";
import { Page } from "../components/Page";
import { Post } from "../components/Post";
import { client } from "../tina/__generated__/client";
import {
  getStaticPathsForPostOrPage,
  getStaticPropsForPostOrPage,
} from "./[filename]";

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

export const getStaticPaths = getStaticPathsForPostOrPage("breadcrumbs");
export const getStaticProps = getStaticPropsForPostOrPage(
  (params) => `${params.filename.join("/")}.mdx`
);
