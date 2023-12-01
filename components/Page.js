export const Page = (props) => {
  const { page } = props;

  return (
    <Layout title={page.title}>
      <div data-tina-field={tinaField(page, "body")}>
        <TinaMarkdown content={page.body} />
      </div>
    </Layout>
  );
};
