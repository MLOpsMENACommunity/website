/**
 * Pass-through root. The real <html>/<body> shells live in the per-edition root
 * layouts under (en)/ and (ar)/ — this exists only so app/not-found.tsx has a
 * root layout to attach to.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children
}
