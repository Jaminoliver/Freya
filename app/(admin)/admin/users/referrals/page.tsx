"use client";

import { useState } from "react";
import ReferralHeader    from "@/components/admin/users/referrals/ReferralHeader";
import ReferralStats     from "@/components/admin/users/referrals/ReferralStats";
import ReferralFilterBar from "@/components/admin/users/referrals/ReferralFilterBar";
import ReferralTable     from "@/components/admin/users/referrals/ReferralTable";
import ReferralSettingsModal from "@/components/admin/users/referrals/ReferralSettingsModal";

export default function ReferralsPage() {
  const [search,         setSearch]         = useState("");
  const [tab,            setTab]            = useState("all");
  const [programActive,  setProgramActive]  = useState(true);
  const [settingsOpen,   setSettingsOpen]   = useState(false);

  return (
    <div className="page">
      <ReferralHeader
        total={312}
        programActive={programActive}
        onToggle={setProgramActive}
        onSettings={() => setSettingsOpen(true)}
      />

      <ReferralStats />

      <ReferralFilterBar
        search={search} onSearch={setSearch}
        tab={tab}       onTab={setTab}
      />

      <ReferralTable search={search} tab={tab} />

      {settingsOpen && (
        <ReferralSettingsModal onClose={() => setSettingsOpen(false)} />
      )}

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