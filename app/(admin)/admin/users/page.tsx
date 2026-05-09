"use client";

import UsersHeader from "@/components/admin/users/all-users/UsersHeader";
import UsersFilterBar from "@/components/admin/users/all-users/UsersFilterBar";
import UsersTable from "@/components/admin/users/all-users/UsersTable";
import { useState } from "react";

export default function AllUsersPage() {
  const [search, setSearch]   = useState("");
  const [role,   setRole]     = useState("all");
  const [status, setStatus]   = useState("all");
  const [country, setCountry] = useState("all");
  const [date,   setDate]     = useState("all");

  return (
    <div className="page">
      <UsersHeader total={142671} />

      <UsersFilterBar
        search={search}   onSearch={setSearch}
        role={role}       onRole={setRole}
        status={status}   onStatus={setStatus}
        country={country} onCountry={setCountry}
        date={date}       onDate={setDate}
      />

      <UsersTable
        search={search}
        role={role}
        status={status}
        country={country}
        date={date}
      />

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