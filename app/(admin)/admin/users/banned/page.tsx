"use client";

import { useState } from "react";
import BannedHeader    from "@/components/admin/users/banned/BannedHeader";
import BannedFilterBar from "@/components/admin/users/banned/BannedFilterBar";
import BannedTable     from "@/components/admin/users/banned/BannedTable";

export default function BannedUsersPage() {
  const [search,       setSearch]       = useState("");
  const [tab,          setTab]          = useState("all");
  const [reasonFilter, setReasonFilter] = useState("all");

  return (
    <div className="page">
      <BannedHeader total={124} banned={89} suspended={35} />

      <BannedFilterBar
        search={search}           onSearch={setSearch}
        tab={tab}                 onTab={setTab}
        reasonFilter={reasonFilter} onReason={setReasonFilter}
      />

      <BannedTable search={search} tab={tab} reasonFilter={reasonFilter} />

      <div style={{ height: 40 }} />

      <style jsx>{`
        .page {
          min-height: 100vh;
          background: #f5f4f9;
          padding-bottom: 40px;
        }
      `}</style>
    </div>
  );
}