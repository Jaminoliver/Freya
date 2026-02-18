import { Sidebar } from "@/components/layout/Sidebar";
import { RightPanel } from "@/components/layout/RightPanel";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#0A0A0F" }}>
      <Sidebar />
      <main style={{ flex: 1, minHeight: "100vh", borderRight: "1px solid #1F1F2A" }}>
        {children}
      </main>
      <RightPanel />
    </div>
  );
}