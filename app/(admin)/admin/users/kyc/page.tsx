"use client";

import { useState } from "react";
import KYCHeader    from "@/components/admin/users/kyc/KYCHeader";
import KYCFilterBar from "@/components/admin/users/kyc/KYCFilterBar";
import KYCTable     from "@/components/admin/users/kyc/KYCTable";

export default function KYCPage() {
  const [search, setSearch] = useState("");
  const [tab,    setTab]    = useState("all");

  return (
    <div className="page">
      <KYCHeader total={648} pending={31} />

      <KYCFilterBar
        search={search} onSearch={setSearch}
        tab={tab}       onTab={setTab}
      />

      <KYCTable search={search} tab={tab} />

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