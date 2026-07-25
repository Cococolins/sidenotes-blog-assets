const TOOLBAR_ITEMS = [
  {
    label: "正文",
    title: "正文",
    action: (editor) => editor.chain().focus().setParagraph().run(),
    active: (editor) => editor.isActive("paragraph"),
  },
  {
    label: "H2",
    title: "二级标题",
    action: (editor) =>
      editor.chain().focus().toggleHeading({ level: 2 }).run(),
    active: (editor) => editor.isActive("heading", { level: 2 }),
  },
  {
    label: "H3",
    title: "三级标题",
    action: (editor) =>
      editor.chain().focus().toggleHeading({ level: 3 }).run(),
    active: (editor) => editor.isActive("heading", { level: 3 }),
  },
  {
    label: "B",
    title: "粗体",
    action: (editor) => editor.chain().focus().toggleBold().run(),
    active: (editor) => editor.isActive("bold"),
  },
  {
    label: "I",
    title: "斜体",
    action: (editor) => editor.chain().focus().toggleItalic().run(),
    active: (editor) => editor.isActive("italic"),
  },
  {
    label: "S",
    title: "删除线",
    action: (editor) => editor.chain().focus().toggleStrike().run(),
    active: (editor) => editor.isActive("strike"),
  },
  {
    label: "`代码`",
    title: "行内代码",
    action: (editor) => editor.chain().focus().toggleCode().run(),
    active: (editor) => editor.isActive("code"),
  },
  {
    label: "引用",
    title: "引用",
    action: (editor) => editor.chain().focus().toggleBlockquote().run(),
    active: (editor) => editor.isActive("blockquote"),
  },
  {
    label: "• 列表",
    title: "无序列表",
    action: (editor) => editor.chain().focus().toggleBulletList().run(),
    active: (editor) => editor.isActive("bulletList"),
  },
  {
    label: "1. 列表",
    title: "有序列表",
    action: (editor) => editor.chain().focus().toggleOrderedList().run(),
    active: (editor) => editor.isActive("orderedList"),
  },
  {
    label: "代码块",
    title: "代码块",
    action: (editor) => editor.chain().focus().toggleCodeBlock().run(),
    active: (editor) => editor.isActive("codeBlock"),
  },
  {
    label: "链接",
    title: "添加或移除链接",
    action: (editor) => {
      if (editor.isActive("link")) {
        editor.chain().focus().extendMarkRange("link").unsetLink().run();
        return;
      }

      const previous = editor.getAttributes("link").href || "https://";
      const href = window.prompt("链接地址", previous);
      if (!href) return;
      if (/^\s*tab:/i.test(href)) {
        window.alert("Visual 模式暂不支持 tab: link。请切换到 Source 模式编辑。");
        return;
      }
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: href.trim() })
        .run();
    },
    active: (editor) => editor.isActive("link"),
  },
  {
    label: "撤销",
    title: "撤销",
    action: (editor) => editor.chain().focus().undo().run(),
    enabled: (editor) => editor.can().chain().focus().undo().run(),
  },
  {
    label: "重做",
    title: "重做",
    action: (editor) => editor.chain().focus().redo().run(),
    enabled: (editor) => editor.can().chain().focus().redo().run(),
  },
];

export function createToolbar(editor, documentObject = document) {
  const toolbar = documentObject.createElement("div");
  toolbar.className = "sn-editor__toolbar";
  toolbar.setAttribute("role", "toolbar");
  toolbar.setAttribute("aria-label", "正文格式");

  const records = TOOLBAR_ITEMS.map((item) => {
    const button = documentObject.createElement("button");
    button.type = "button";
    button.className = "sn-editor__tool";
    button.textContent = item.label;
    button.title = item.title;
    button.setAttribute("aria-label", item.title);
    button.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse") event.preventDefault();
    });
    button.addEventListener("click", () => {
      item.action(editor);
      update();
    });
    toolbar.append(button);
    return { button, item };
  });

  function update() {
    for (const { button, item } of records) {
      const active = item.active?.(editor) || false;
      const enabled = item.enabled?.(editor) ?? true;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
      button.disabled = !enabled;
    }
  }

  const updateEvents = ["selectionUpdate", "transaction"];
  for (const eventName of updateEvents) editor.on(eventName, update);
  update();

  return {
    element: toolbar,
    destroy() {
      for (const eventName of updateEvents) editor.off(eventName, update);
      toolbar.remove();
    },
  };
}
