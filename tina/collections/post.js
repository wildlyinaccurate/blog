/**
 * @type {import('tinacms').Collection}
 */
export default {
  label: "Blog Posts",
  name: "post",
  path: "content/post",
  format: "mdx",
  fields: [
    {
      type: "string",
      label: "Title",
      name: "title",
      isTitle: true,
    },
    {
      type: "rich-text",
      label: "Post Body",
      name: "body",
      isBody: true,
      templates: [
        {
          name: "CodeBlock",
          label: "Syntax Highlighted Code Block",
          fields: [
            {
              name: "language",
              label: "Language",
              type: "string",
            },
          ],
        },
        {
          name: "ScriptEmbed",
          label: "JavaScript Embed",
          fields: [
            {
              name: "src",
              label: "src",
              type: "string",
            },
            {
              name: "id",
              label: "id",
              type: "string",
            },
          ],
        },
        {
          name: "JSFiddleEmbed",
          label: "JSFiddle Embed",
          fields: [
            {
              name: "src",
              label: "src",
              type: "string",
            },
            {
              name: "height",
              label: "height",
              type: "number",
            },
          ],
        },
        {
          name: "CarbonAd",
          label: "Carbon Ad Placement",
          fields: [{ name: "id", label: "id", type: "string" }],
        },
      ],
    },
    {
      label: "Parent Post",
      name: "parent",
      type: "reference",
      collections: ["post"],
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
