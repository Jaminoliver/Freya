"use client";

import { useState } from "react";
import UserRowActions from "./UserRowActions";
import UserProfilePanel from "./UserProfilePanel";

export interface AdminUser {
  id:        string;
  name:      string;
  email:     string;
  username:  string;
  avatar:    string;
  initials:  string;
  color:     string;
  role:      "fan" | "creator" | "admin";
  status:    "active" | "suspended" | "banned";
  country:   string;
  joined:    string;
  bio:       string;
  subs:      number;
  posts:     number;
  spent:     string;
  earned:    string;
}

const MOCK_USERS: AdminUser[] = [
  { id:"1",  name:"Luna Rose",    email:"luna@example.com",    username:"lunarose",    avatar:"", initials:"LR", color:"#a855f7", role:"creator", status:"active",    country:"US", joined:"Jan 12, 2024", bio:"Content creator & model", subs:3241, posts:184, spent:"$0",      earned:"$12,840" },
  { id:"2",  name:"James Okafor", email:"james@example.com",   username:"jamesk",      avatar:"", initials:"JO", color:"#3b82f6", role:"fan",     status:"active",    country:"NG", joined:"Feb 3, 2024",  bio:"Just a fan",             subs:0,    posts:0,   spent:"$240",    earned:"$0"      },
  { id:"3",  name:"Mia Storm",    email:"mia@example.com",     username:"miastorm",    avatar:"", initials:"MS", color:"#ec4899", role:"creator", status:"active",    country:"UK", joined:"Mar 8, 2024",  bio:"Lifestyle creator",      subs:2108, posts:97,  spent:"$0",      earned:"$9,320"  },
  { id:"4",  name:"Derek Walsh",  email:"derek@example.com",   username:"derekw",      avatar:"", initials:"DW", color:"#f59e0b", role:"fan",     status:"suspended", country:"CA", joined:"Apr 1, 2024",  bio:"",                       subs:0,    posts:0,   spent:"$80",     earned:"$0"      },
  { id:"5",  name:"Aria Black",   email:"aria@example.com",    username:"ariablack",   avatar:"", initials:"AB", color:"#10b981", role:"creator", status:"active",    country:"AU", joined:"Apr 15, 2024", bio:"Fitness & wellness",     subs:1432, posts:62,  spent:"$0",      earned:"$6,540"  },
  { id:"6",  name:"Sam Torres",   email:"sam@example.com",     username:"samtorres",   avatar:"", initials:"ST", color:"#6366f1", role:"fan",     status:"banned",    country:"DE", joined:"May 2, 2024",  bio:"",                       subs:0,    posts:0,   spent:"$12",     earned:"$0"      },
  { id:"7",  name:"Nova Kai",     email:"nova@example.com",    username:"novakai",     avatar:"", initials:"NK", color:"#f97316", role:"creator", status:"active",    country:"FR", joined:"May 20, 2024", bio:"Art & photography",      subs:1198, posts:43,  spent:"$0",      earned:"$5,290"  },
  { id:"8",  name:"Lena Park",    email:"lena@example.com",    username:"lenapark",    avatar:"", initials:"LP", color:"#14b8a6", role:"fan",     status:"active",    country:"US", joined:"Jun 4, 2024",  bio:"Avid subscriber",        subs:0,    posts:0,   spent:"$320",    earned:"$0"      },
];

const ROLE_STYLES: Record<string, { bg: string; color: string }> = {
  fan:     { bg: "#eff6ff", color: "#2563eb" },
  creator: { bg: "#faf5ff", color: "#7c3aed" },
  admin:   { bg: "#fff7ed", color: "#c2410c" },
};

const STATUS_STYLES: Record<string, { bg: string; color: string; dot: string }> = {
  active:    { bg: "#f0fdf4", color: "#16a34a", dot: "#16a34a" },
  suspended: { bg: "#fffbeb", color: "#d97706", dot: "#d97706" },
  banned:    { bg: "#fff1f2", color: "#e11d48", dot: "#e11d48" },
};

interface Props {
  search:  string;
  role:    string;
  status:  string;
  country: string;
  date:    string;
}

export default function UsersTable({ search, role, status, country }: Props) {
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [users, setUsers] = useState<AdminUser[]>(MOCK_USERS);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch  = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.username.toLowerCase().includes(q);
    const matchRole    = role    === "all" || u.role    === role;
    const matchStatus  = status  === "all" || u.status  === status;
    const matchCountry = country === "all" || u.country === country;
    return matchSearch && matchRole && matchStatus && matchCountry;
  });

  const handleAction = (action: string, user: AdminUser) => {
    if (action === "view")        return setSelectedUser(user);
    if (action === "ban")         return setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, status: "banned"    } : u));
    if (action === "suspend")     return setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, status: "suspended" } : u));
    if (action === "unban")       return setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, status: "active"    } : u));
    if (action === "make_creator")return setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, role: "creator"     } : u));
    if (action === "make_fan")    return setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, role: "fan"         } : u));
  };

  return (
    <>
      <div className="table-wrap">
        <div className="card">
          <div className="result-count">
            {filtered.length} user{filtered.length !== 1 ? "s" : ""} found
          </div>

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Country</th>
                  <th>Joined</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "48px 0", color: "#9b9aaa", fontSize: "14px" }}>
                      No users match your filters
                    </td>
                  </tr>
                )}
                {filtered.map((user, i) => {
                  const roleStyle   = ROLE_STYLES[user.role];
                  const statusStyle = STATUS_STYLES[user.status];
                  return (
                    <tr
                      key={user.id}
                      className="user-row"
                      style={{ animationDelay: `${i * 40}ms` }}
                      onClick={() => setSelectedUser(user)}
                    >
                      {/* User cell */}
                      <td>
                        <div className="user-cell">
                          <div className="avatar" style={{ background: user.color + "22", color: user.color }}>
                            {user.initials}
                          </div>
                          <div>
                            <div className="user-name">{user.name}</div>
                            <div className="user-email">{user.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td>
                        <span className="badge" style={{ background: roleStyle.bg, color: roleStyle.color }}>
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </span>
                      </td>

                      {/* Status */}
                      <td>
                        <span className="status-badge" style={{ background: statusStyle.bg, color: statusStyle.color }}>
                          <span className="status-dot" style={{ background: statusStyle.dot }} />
                          {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                        </span>
                      </td>

                      {/* Country */}
                      <td><span className="country">{user.country}</span></td>

                      {/* Joined */}
                      <td><span className="joined">{user.joined}</span></td>

                      {/* Actions */}
                      <td onClick={(e) => e.stopPropagation()}>
                        <UserRowActions user={user} onAction={handleAction} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedUser && (
        <UserProfilePanel
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onAction={handleAction}
        />
      )}

      <style jsx>{`
        .table-wrap {
          padding: 16px 32px 0;
        }
        .card {
          background: #fff;
          border: 1px solid #eeecf8;
          border-radius: 16px;
          overflow: hidden;
        }
        .result-count {
          padding: 14px 20px;
          font-size: 12.5px;
          color: #9b9aaa;
          font-weight: 500;
          border-bottom: 1px solid #f3f4f6;
        }
        .table-scroll { overflow-x: auto; }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        thead th {
          font-size: 11px;
          font-weight: 600;
          color: #9b9aaa;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 12px 16px;
          text-align: left;
          background: #faf9fe;
          border-bottom: 1px solid #f3f4f6;
          white-space: nowrap;
        }
        .user-row {
          animation: rowIn 0.35s ease both;
          cursor: pointer;
          transition: background 0.15s;
        }
        .user-row:hover td { background: #faf8ff; }
        td {
          padding: 12px 16px;
          border-bottom: 1px solid #f3f4f6;
          vertical-align: middle;
          font-size: 13px;
          color: #3d3b52;
        }
        .user-row:last-child td { border-bottom: none; }
        .user-cell {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          flex-shrink: 0;
        }
        .user-name {
          font-size: 13.5px;
          font-weight: 600;
          color: #0f0e1a;
        }
        .user-email {
          font-size: 12px;
          color: #9b9aaa;
          margin-top: 1px;
        }
        .badge {
          display: inline-block;
          padding: 3px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }
        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .country {
          font-size: 13px;
          color: #3d3b52;
          font-weight: 500;
        }
        .joined {
          font-size: 12.5px;
          color: #9b9aaa;
          white-space: nowrap;
        }
        @keyframes rowIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
      `}</style>
    </>
  );
}