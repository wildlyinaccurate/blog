/**
 * @type {import('tinacms').Collection}
 */
export default {
  label: "Blog Posts",
  name: "post",
  path: "content/post",
  fields: [
    {
      type: "string",
      label: "Title",
      name: "title",
    },
    {
      type: "datetime",
      label: "Published Date",
      name: "created_at",
      ui: {
        dateFormat: "MMMM DD YYYY",
        timeFormat: "hh:mm A",
      },
    },
    {
      type: "datetime",
      label: "Last Updated Date",
      name: "updated_at",
      ui: {
        dateFormat: "MMMM DD YYYY",
        timeFormat: "hh:mm A",
      },
    },
    {
      type: "string",
      label: "Blog Post Body",
      name: "body",
      isBody: true,
      ui: {
        component: "textarea",
      },
    },
  ],
  indexes: [
    {
      name: "created_at",
      fields: [{ name: "created_at" }],
    },
  ],
  ui: {
    router: ({ document }) => {
      return `/${document._sys.filename}`;
    },
  },
};
