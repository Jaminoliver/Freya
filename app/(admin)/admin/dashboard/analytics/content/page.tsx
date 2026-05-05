"use client";

import ContentAnalyticsHeader from "@/components/admin/dashboard/content-analytics/ContentAnalyticsHeader";
import ContentStatCards from "@/components/admin/dashboard/content-analytics/ContentStatCards";
import UploadVolumeChart from "@/components/admin/dashboard/content-analytics/UploadVolumeChart";
import ContentTypeBreakdown from "@/components/admin/dashboard/content-analytics/ContentTypeBreakdown";
import LiveStreamStatsCard from "@/components/admin/dashboard/content-analytics/LiveStreamStatsCard";
import TopViewedPostsTable from "@/components/admin/dashboard/content-analytics/TopViewedPostsTable";
import TopPPVContentTable from "@/components/admin/dashboard/content-analytics/TopPPVContentTable";
import TopTippedPostsTable from "@/components/admin/dashboard/content-analytics/TopTippedPostsTable";

export default function ContentAnalyticsPage() {
  return (
    <div className="page">
      <ContentAnalyticsHeader />
      <ContentStatCards />

      {/* Upload chart */}
      <div className="section">
        <UploadVolumeChart />
      </div>

      {/* Type breakdown + Live streams row */}
      <div className="charts-row">
        <ContentTypeBreakdown />
        <LiveStreamStatsCard />
      </div>

      {/* Tables */}
      <div className="section">
        <TopViewedPostsTable />
      </div>

      <div className="section">
        <TopPPVContentTable />
      </div>

      <div className="section">
        <TopTippedPostsTable />
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