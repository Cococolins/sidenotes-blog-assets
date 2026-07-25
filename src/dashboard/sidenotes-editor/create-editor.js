import { Editor } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import { Markdown } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";

export function createEditorExtensions() {
  return [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3],
      },
      link: {
        openOnClick: false,
        autolink: false,
        defaultProtocol: "https",
        HTMLAttributes: {
          rel: "noopener noreferrer",
        },
      },
      trailingNode: false,
      underline: false,
    }),
    Image.configure({
      allowBase64: false,
      inline: false,
    }),
    Markdown.configure({
      indentation: {
        style: "space",
        size: 2,
      },
      markedOptions: {
        gfm: true,
        breaks: false,
      },
    }),
  ];
}

export function createVisualEditor({ element, markdown, onUpdate }) {
  return new Editor({
    element,
    extensions: createEditorExtensions(),
    content: markdown,
    contentType: "markdown",
    autofocus: false,
    editorProps: {
      attributes: {
        class: "sn-editor__prosemirror",
        spellcheck: "true",
        autocapitalize: "sentences",
        "aria-label": "文章正文 Visual 编辑器",
      },
    },
    onUpdate,
  });
}
