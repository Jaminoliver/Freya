"use client";

import { useState } from "react";
import CreatorsHeader from "@/components/admin/users/creators/CreatorsHeader";
import CreatorsFilterBar from "@/components/admin/users/creators/CreatorsFilterBar";
import CreatorsTable from "@/components/admin/users/creators/CreatorsTable";

export default function CreatorAccountsPage() {
  const [search, setSearch] = useState("");
  const [tab,    setTab]    = useState("all");

  return (
    <div className="page">
      <CreatorsHeader total={1284} pending={23} />

      <CreatorsFilterBar
        search={search} onSearch={setSearch}
        tab={tab}       onTab={setTab}
      />

      <CreatorsTable search={search} tab={tab} />

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