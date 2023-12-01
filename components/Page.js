import { Layout } from "../components/Layout";
import { TinaMarkdown } from "tinacms/dist/rich-text";
import { tinaField } from "tinacms/dist/react";

export const Page = (props) => {
  const { page } = props;

  return (
    <Layout title={page.title}>
      {page.title && (
        <h2 data-tina-field={tinaField(page, "title")}>{page.title}</h2>
      )}

      <div data-tina-field={tinaField(page, "body")}>
        <TinaMarkdown content={page.body} />
      </div>
    </Layout>
  );
};
