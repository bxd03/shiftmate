import Script from "next/script";
import { shiftmateShell } from "../app/shiftmate-shell";

export function ShiftmateShell({ mode = "admin" }: { mode?: "admin" | "signup" }) {
  return <div data-shiftmate-mode={mode}>
    <link rel="stylesheet" href="/styles.css" />
    <div dangerouslySetInnerHTML={{ __html: shiftmateShell }} />
    <Script src="/app.js" strategy="afterInteractive" />
  </div>;
}
