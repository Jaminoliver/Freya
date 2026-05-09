"use client";

import { useState } from "react";
import CreatorRowActions from "./CreatorRowActions";
import CreatorProfilePanel from "./CreatorProfilePanel";

export interface Creator {
  id:           string;
  name:         string;
  email:        string;
  username:     string;
  initials:     string;
  color:        string;
  status:       "pending" | "approved" | "rejected";
  commission:   number;
  earnings:     string;
  subs:         number;
  posts:        number;
  featured:     boolean;
  joined:       string;
  holdDays:     number;
  categories:   string[];
  bio:          string;
}

const MOCK: Creator[] = [
  { id:"1", name:"Luna Rose",    email:"luna@example.com",   username:"lunarose",   initials:"LR", color:"#a855f7", status:"approved", commission:20, earnings:"$12,840", subs:3241, posts:184, featured:true,  joined:"Jan 12, 2024", holdDays:3,  categories:["photos","videos"],         bio:"Content creator & model"     },
  { id:"2", name:"Mia Storm",    email:"mia@example.com",    username:"miastorm",   initials:"MS", color:"#ec4899", status:"approved", commission:20, earnings:"$9,320",  subs:2108, posts:97,  featured:false, joined:"Mar 8, 2024",  holdDays:3,  categories:["videos","live"],           bio:"Lifestyle creator"           },
  { id:"3", name:"Jade Voss",    email:"jade@example.com",   username:"jadevoss",   initials:"JV", color:"#3b82f6", status:"pending",  commission:20, earnings:"$0",      subs:0,    posts:0,   featured:false, joined:"May 1, 2024",  holdDays:7,  categories:[],                         bio:"New creator application"     },
  { id:"4", name:"Aria Black",   email:"aria@example.com",   username:"ariablack",  initials:"AB", color:"#10b981", status:"approved", commission:15, earnings:"$6,540",  subs:1432, posts:62,  featured:true,  joined:"Apr 15, 2024", holdDays:3,  categories:["photos","audio"],         bio:"Fitness & wellness"          },
  { id:"5", name:"Nova Kai",     email:"nova@example.com",   username:"novakai",    initials:"NK", color:"#f97316", status:"approved", commission:20, earnings:"$5,290",  subs:1198, posts:43,  featured:false, joined:"May 20, 2024", holdDays:3,  categories:["photos"],                 bio:"Art & photography"           },
  { id:"6", name:"Sam Torres",   email:"sam@example.com",    username:"samtorres",  initials:"ST", color:"#6366f1", status:"rejected", commission:20, earnings:"$0",      subs:0,    posts:0,   featured:false, joined:"May 2, 2024",  holdDays:7,  categories:[],                         bio:"Application rejected"        },
  { id:"7", name:"Rena Wolf",    email:"rena@example.com",   username:"renawolf",   initials:"RW", color:"#14b8a6", status:"pending",  commission:20, earnings:"$0",      subs:0,    posts:0,   featured:false, joined:"Jun 1, 2024",  holdDays:7,  categories:[],                         bio:"Awaiting KYC review"         },
  { id:"8", name:"Zoe Blake",    email:"zoe@example.com",    username:"zoeblake",   initials:"ZB", color:"#f59e0b", status:"approved", commission:25, earnings:"$3,120",  subs:876,  posts:31,  featured:false, joined:"Jun 10, 2024", holdDays:5,  categories:["videos","live","photos"], bio:"Gaming & lifestyle"          },
];

const STATUS_STYLES: Record<string, { bg: string; color: string; dot: string }> = {
  approved: { bg: "#f0fdf4", color: "#16a34a", dot: "#16a34a" },
  pending:  { bg: "#fffbeb", color: "#d97706", dot: "#d97706" },
  rejected: { bg: "#fff1f2", color: "#e11d48", dot: "#e11d48" },
};

interface Props { search: string; tab: string; }

export default function CreatorsTable({ search, tab }: Props) {
  const [creators,      setCreators]      = useState<Creator[]>(MOCK);
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);

  const filtered = creators.filter((c) => {
    const q           = search.toLowerCase();
    const matchSearch = !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.username.toLowerCase().includes(q);
    const matchTab    = tab === "all" || c.status === tab;
    return matchSearch && matchTab;
  });

  const toggleFeatured = (id: string) =>
    setCreators((prev) => prev.map((c) => c.id === id ? { ...c, featured: !c.featured } : c));

  const handleAction = (action: string, creator: Creator) => {
    if (action === "view")     return setSelectedCreator(creator);
    if (action === "approve")  return setCreators((prev) => prev.map((c) => c.id === creator.id ? { ...c, status: "approved" } : c));
    if (action === "reject")   return setCreators((prev) => prev.map((c) => c.id === creator.id ? { ...c, status: "rejected" } : c));
  };

  const handlePanelSave = (updated: Creator) =>
    setCreators((prev) => prev.map((c) => c.id === updated.id ? updated : c));

  return (
    <>
      <div className="table-wrap">
        <div className="card">
          <div className="result-count">
            {filtered.length} creator{filtered.length !== 1 ? "s" : ""} found
          </div>

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Creator</th>
                  <th>Status</th>
                  <th>Commission</th>
                  <th>Earnings</th>
                  <th>Subscribers</th>
                  <th>Featured</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign:"center", padding:"48px 0", color:"#9b9aaa", fontSize:"14px" }}>
                      No creators match your filters
                    </td>
                  </tr>
                )}
                {filtered.map((c, i) => {
                  const ss = STATUS_STYLES[c.status];
                  return (
                    <tr
                      key={c.id}
                      className="creator-row"
                      style={{ animationDelay:`${i * 40}ms` }}
                      onClick={() => setSelectedCreator(c)}
                    >
                      {/* Creator */}
                      <td>
                        <div className="creator-cell">
                          <div className="avatar" style={{ background: c.color + "22", color: c.color }}>
                            {c.initials}
                          </div>
                          <div>
                            <div className="creator-name">{c.name}</div>
                            <div className="creator-email">{c.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        {c.status === "pending" ? (
                          <div className="approval-btns" onClick={(e) => e.stopPropagation()}>
                            <button className="approve-btn" onClick={() => handleAction("approve", c)}>Approve</button>
                            <button className="reject-btn"  onClick={() => handleAction("reject",  c)}>Reject</button>
                          </div>
                        ) : (
                          <span className="status-badge" style={{ background: ss.bg, color: ss.color }}>
                            <span className="dot" style={{ background: ss.dot }} />
                            {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                          </span>
                        )}
                      </td>

                      {/* Commission */}
                      <td><span className="commission">{c.commission}%</span></td>

                      {/* Earnings */}
                      <td><span className="earnings">{c.earnings}</span></td>

                      {/* Subscribers */}
                      <td><span className="subs">{c.subs.toLocaleString()}</span></td>

                      {/* Featured toggle */}
                      <td onClick={(e) => e.stopPropagation()}>
                        <button
                          className={`toggle ${c.featured ? "on" : "off"}`}
                          onClick={() => toggleFeatured(c.id)}
                          title={c.featured ? "Unfeature" : "Feature on homepage"}
                        >
                          <span className="toggle-thumb" />
                        </button>
                      </td>

                      {/* Actions */}
                      <td onClick={(e) => e.stopPropagation()}>
                        <CreatorRowActions creator={c} onAction={handleAction} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedCreator && (
        <CreatorProfilePanel
          creator={selectedCreator}
          onClose={() => setSelectedCreator(null)}
          onSave={handlePanelSave}
          onAction={handleAction}
        />
      )}

      <style jsx>{`
        .table-wrap { padding: 16px 32px 0; }
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
        table { width: 100%; border-collapse: collapse; }
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
        .creator-row {
          animation: rowIn 0.35s ease both;
          cursor: pointer;
          transition: background 0.15s;
        }
        .creator-row:hover td { background: #faf8ff; }
        td {
          padding: 12px 16px;
          border-bottom: 1px solid #f3f4f6;
          vertical-align: middle;
          font-size: 13px;
        }
        .creator-row:last-child td { border-bottom: none; }
        .creator-cell { display: flex; align-items: center; gap: 10px; }
        .avatar {
          width: 36px; height: 36px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 700; flex-shrink: 0;
        }
        .creator-name  { font-size: 13.5px; font-weight: 600; color: #0f0e1a; }
        .creator-email { font-size: 12px; color: #9b9aaa; margin-top: 1px; }
        .status-badge {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600;
        }
        .dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .approval-btns { display: flex; gap: 6px; }
        .approve-btn {
          padding: 4px 10px; border-radius: 6px; border: none;
          background: #f0fdf4; color: #16a34a; font-size: 12px; font-weight: 600;
          cursor: pointer; transition: background 0.15s; font-family: inherit;
        }
        .approve-btn:hover { background: #dcfce7; }
        .reject-btn {
          padding: 4px 10px; border-radius: 6px; border: none;
          background: #fff1f2; color: #e11d48; font-size: 12px; font-weight: 600;
          cursor: pointer; transition: background 0.15s; font-family: inherit;
        }
        .reject-btn:hover { background: #ffe4e6; }
        .commission { font-size: 13px; font-weight: 600; color: #7c3aed; }
        .earnings   { font-size: 13px; font-weight: 600; color: #0f0e1a; }
        .subs       { font-size: 13px; color: #3d3b52; }
        .toggle {
          width: 36px; height: 20px; border-radius: 20px; border: none;
          cursor: pointer; position: relative; transition: background 0.25s;
          flex-shrink: 0;
        }
        .toggle.on  { background: #7c3aed; }
        .toggle.off { background: #e4e2f2; }
        .toggle-thumb {
          position: absolute; top: 3px;
          width: 14px; height: 14px; border-radius: 50%; background: #fff;
          transition: left 0.25s cubic-bezier(0.4,0,0.2,1);
          box-shadow: 0 1px 4px rgba(0,0,0,0.15);
        }
        .toggle.on  .toggle-thumb { left: 19px; }
        .toggle.off .toggle-thumb { left: 3px;  }
        @keyframes rowIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
      `}</style>
    </>
  );
}