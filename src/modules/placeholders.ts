// Per-instance placeholders. Webflow can't bind a form field's placeholder
// to a component prop (nor set it through the API), so the component
// exposes a text prop bound to data-placeholder and this copies it over at
// runtime (conventions.md §10). The Designer canvas runs no script, so it
// shows the input's own placeholder setting.
// Markup: <input data-placeholder="…"> or <textarea data-placeholder="…">
export function initPlaceholders() {
  document
    .querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input[data-placeholder], textarea[data-placeholder]')
    .forEach((field) => {
      const text = field.dataset.placeholder?.trim();
      if (text) field.placeholder = text;
    });
}
