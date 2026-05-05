"use client";

import UserAnalyticsHeader from "@/components/admin/dashboard/user-analytics/UserAnalyticsHeader";
import UserStatsCards from "@/components/admin/dashboard/user-analytics/UserStatsCards";
import RegistrationsOverTimeChart from "@/components/admin/dashboard/user-analytics/RegistrationsOverTimeChart";
import CreatorFanRatioChart from "@/components/admin/dashboard/user-analytics/CreatorFanRatioChart";
import RetentionChurnCard from "@/components/admin/dashboard/user-analytics/RetentionChurnCard";
import GeographicBreakdownCard from "@/components/admin/dashboard/user-analytics/GeographicBreakdownCard";
import DevicePlatformCard from "@/components/admin/dashboard/user-analytics/DevicePlatformCard";
import PeakActivityHeatmap from "@/components/admin/dashboard/user-analytics/PeakActivityHeatmap";

export default function UserAnalyticsPage() {
  return (
    <div className="page">
      <UserAnalyticsHeader />
      <UserStatsCards />

      {/* Growth chart */}
      <div className="section">
        <RegistrationsOverTimeChart />
      </div>

      {/* Ratio + Retention row */}
      <div className="charts-row">
        <CreatorFanRatioChart />
        <RetentionChurnCard />
      </div>

      {/* Geo + Device row */}
      <div className="charts-row">
        <GeographicBreakdownCard />
        <DevicePlatformCard />
      </div>

      {/* Heatmap */}
      <div className="section">
        <PeakActivityHeatmap />
      </div>

      <div style={{ height: 40 }} />

      <style jsx>{`
        .page {
          min-height: 100vh;
          background: #f5f4f9;
          padding-bottom: 40px;
          overflow-x: hidden;
          width: 100%;
          box-sizing: border-box;
        }
        .section {
          padding: 16px 32px 0;
          min-width: 0;
          width: 100%;
          box-sizing: border-box;
        }
        .charts-row {
          display: flex;
          gap: 16px;
          padding: 16px 32px 0;
          align-items: flex-start;
          min-width: 0;
          width: 100%;
          box-sizing: border-box;
        }
        .charts-row > :global(*) {
          flex: 1;
          min-width: 0;
        }
        @media (max-width: 1024px) {
          .charts-row { flex-direction: column; }
          .section { padding: 16px 16px 0; }
          .charts-row { padding: 16px 16px 0; }
        }
      `}</style>
    </div>
  );
}