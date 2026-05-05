"use client";

import DashboardHeader from "@/components/admin/dashboard/DashboardHeader";
import GatewayStatusBar from "@/components/admin/dashboard/GatewayStatusBar";
import StatCardGrid from "@/components/admin/dashboard/StatCardGrid";
import RetentionBar from "@/components/admin/dashboard/RetentionBar";
import RevenueOverTimeChart from "@/components/admin/dashboard/RevenueOverTimeChart";
import RevenueBreakdownChart from "@/components/admin/dashboard/RevenueBreakdownChart";
import TopCreatorsTable from "@/components/admin/dashboard/TopCreatorsTable";
import RecentActivityFeed from "@/components/admin/dashboard/RecentActivityFeed";
import SignupsChart from "@/components/admin/dashboard/Signupschart";

export default function AdminDashboardPage() {
  return (
    <div className="page">
      <DashboardHeader />
      <GatewayStatusBar />
      <StatCardGrid />
      <RetentionBar />
<SignupsChart />

      {/* Charts Row */}
      <div className="charts-row">
        <RevenueOverTimeChart />
        <RevenueBreakdownChart />
      </div>

      {/* Bottom Row */}
      <div className="bottom-row">
        <TopCreatorsTable />
        <RecentActivityFeed />
      </div>

      <div style={{ height: 40 }} />

      <style jsx>{`
        .page {
          min-height: 100vh;
          background: #f5f4f9;
          padding-bottom: 40px;
        }
        .charts-row {
          display: flex;
          gap: 16px;
          padding: 16px 32px 0;
          align-items: flex-start;
        }
        .bottom-row {
          display: flex;
          gap: 16px;
          padding: 16px 32px 0;
          align-items: flex-start;
        }
        @media (max-width: 1024px) {
          .charts-row { flex-direction: column; }
          .bottom-row { flex-direction: column; }
        }
      `}</style>
    </div>
  );
}