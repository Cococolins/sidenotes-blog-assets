export function findBearEditorDom(documentObject = document) {
  const forms = documentObject.querySelectorAll("form.post-form");
  const textareas = documentObject.querySelectorAll("#body_content");
  const headers = documentObject.querySelectorAll("#header_content");

  if (forms.length !== 1 || textareas.length !== 1 || headers.length !== 1) {
    return null;
  }

  const form = forms[0];
  const textarea = textareas[0];
  const header = headers[0];

  if (
    !(form instanceof HTMLFormElement) ||
    !(textarea instanceof HTMLTextAreaElement) ||
    !(header instanceof HTMLElement) ||
    !header.isContentEditable
  ) {
    return null;
  }

  if (!form.contains(textarea) || !form.contains(header)) return null;

  return { form, textarea, header };
}

export function isBearEditorAction(target, form) {
  if (!(target instanceof Element)) return false;
  const control = target.closest(
    'button, input[type="submit"], input[type="button"], a',
  );
  if (!control) return false;

  if (form.contains(control)) return true;

  const identity = `${control.id} ${control.getAttribute("name") || ""} ${control.textContent || ""}`;
  return /preview|publish|save|draft|unpublish/i.test(identity);
}
