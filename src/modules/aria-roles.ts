// ARIA roles Webflow overwrites on publish. A Collection List's list and
// items always publish role="list" / "listitem", whatever the Designer set,
// which breaks a table, tab list or menu built from one. Put the intended
// role in data-aria-role (conventions.md §9, §11) and this sets it.
// Markup: <div class="w-dyn-items" data-aria-role="rowgroup">,
//         <div class="w-dyn-item" data-aria-role="row">
export function initAriaRoles() {
  document.querySelectorAll<HTMLElement>('[data-aria-role]').forEach((el) => {
    const role = el.dataset.ariaRole?.trim();
    if (role) el.setAttribute('role', role);
  });
}
