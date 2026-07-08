import { redirect } from "next/navigation";

// Sprint 4 replaces this with the director dashboard; until then the
// project list is the app's home.
export default function Home() {
  redirect("/projects");
}
