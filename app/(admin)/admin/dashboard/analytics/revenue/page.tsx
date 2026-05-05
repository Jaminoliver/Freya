"use client";

import RevenueHeader from "@/components/admin/dashboard/revenue/RevenueHeader";
import RevenueStatCards from "@/components/admin/dashboard/revenue/RevenueStatCards";
import RevenueOverTimeChart from "@/components/admin/dashboard/revenue/RevenueOverTimeChart";
import RevenueByTypeChart from "@/components/admin/dashboard/revenue/RevenueByTypeChart";
import GatewayBreakdownCard from "@/components/admin/dashboard/revenue/GatewayBreakdownCard";
import TopCreatorsRevenueTable from "@/components/admin/dashboard/revenue/TopCreatorsRevenueTable";
import TopSpendingFansTable from "@/components/admin/dashboard/revenue/TopSpendingFansTable";
import RefundChargebackTable from "@/components/admin/dashboard/revenue/RefundChargebackTable";

export default function RevenueAnalyticsPage() {
  return (
    <div className="page">
      <RevenueHeader />
      <RevenueStatCards />

      {/* Main chart */}
      <div className="section">
        <RevenueOverTimeChart />
      </div>

      {/* Charts row */}
      <div className="charts-row">
        <RevenueByTypeChart />
        <GatewayBreakdownCard />
      </div>

      {/* Tables row */}
      <div className="tables-row">
        <TopCreatorsRevenueTable />
        <TopSpendingFansTable />
      </div>

      {/* Refunds */}
      <div className="section">
        <RefundChargebackTable />
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
        .tables-row {
          display: flex;
          gap: 16px;
          padding: 16px 32px 0;
          align-items: flex-start;
          min-width: 0;
          width: 100%;
          box-sizing: border-box;
        }
        .tables-row > :global(*) {
          flex: 1;
          min-width: 0;
        }
        @media (max-width: 1024px) {
          .charts-row { flex-direction: column; }
          .tables-row { flex-direction: column; }
        }
      `}</style>
    </div>
  );
}