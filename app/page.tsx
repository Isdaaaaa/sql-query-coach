import { AppShell } from "@/components/app-shell";
import { sampleScenarios } from "@/lib/data/sample-scenarios";

export default function HomePage() {
  return <AppShell scenarios={sampleScenarios} />;
}
