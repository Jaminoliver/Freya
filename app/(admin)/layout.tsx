import Sidebar from "@/components/admin/sidebar/Sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f5f4f9" }}>
      <Sidebar />
      <main style={{ flex: 1, marginLeft: "280px", minHeight: "100vh", minWidth: 0, overflowX: "hidden", transition: "margin-left 0.3s cubic-bezier(0.4,0,0.2,1)" }}>
        {children}
      </main>
    </div>
  );
}