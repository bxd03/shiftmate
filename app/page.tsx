import { redirect } from "next/navigation";
import { chatGPTSignInPath, chatGPTSignOutPath, getChatGPTUser } from "./chatgpt-auth";
import { isOwner } from "../lib/shiftmate-api";
import { ShiftmateShell } from "../components/shiftmate-shell";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getChatGPTUser();
  if (!user) redirect(chatGPTSignInPath("/"));
  if (!(await isOwner())) {
    return <main style={{ maxWidth: 620, margin: "12vh auto", padding: 24, fontFamily: "Arial, sans-serif", color: "#182238" }}>
      <h1>Shiftmate admin access required</h1>
      <p>This management workspace is limited to its owner. Worker sign-up remains available at <a href="/signup">the Shiftmate registration page</a>.</p>
      <a href={chatGPTSignOutPath("/signup")}>Sign out</a>
    </main>;
  }
  return <ShiftmateShell />;
}
