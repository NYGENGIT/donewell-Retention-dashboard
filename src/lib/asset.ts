// Prefix any public asset path with the deployment base path so links work
// both locally (base = "") and on GitHub Pages project sites (base = "/<repo>").
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';

export function asset(path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${BASE}${clean}`;
}
