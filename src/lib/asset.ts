// Resolve a public asset path RELATIVE to the page that is currently loaded.
//
// The dashboard is a single static page. Whatever URL it is served from
// (a GitHub Pages project sub-path like /my-repo/, a user/org root site, a
// local dev server, or a static-file preview), its `data/`, `charts/`,
// `linkedin/` and `downloads/` folders always sit directly next to it.
//
// By returning a path WITHOUT a leading slash, the browser resolves it against
// the current document's URL, so it lands in the right place in every one of
// those cases — no NEXT_PUBLIC_BASE_PATH needed and no 404s when the deploy
// sub-path doesn't match what the site was built for.
export function asset(path: string): string {
  return path.replace(/^\/+/, '');
}
