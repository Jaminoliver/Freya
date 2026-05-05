"use client";

import {
  Users,
  ShieldCheck,
  Ban,
  GitBranch,
  ClipboardList,
  Flag,
  Settings2,
  DollarSign,
  CreditCard,
  Landmark,
  Radio,
  MessageSquare,
  Building2,
  UserCog,
  Settings,
} from "lucide-react";

import SidebarSection from "./SidebarSection";
import SidebarNavItem from "./SidebarNavItem";
import SidebarAnalyticsDropdown from "./SidebarAnalyticsDropdown";

interface Props {
  collapsed: boolean;
}

export default function SidebarNav({ collapsed }: Props) {
  return (
    <nav className="sidebar-nav">

      {/* MAIN */}
      <SidebarSection label="Main" collapsed={collapsed} />
      <SidebarAnalyticsDropdown collapsed={collapsed} />

      {/* USERS */}
      <SidebarSection label="Users" collapsed={collapsed} />
      <SidebarNavItem collapsed={collapsed} label="All Users" href="/admin/users" icon={Users} />
      <SidebarNavItem collapsed={collapsed} label="KYC Verification" href="/admin/kyc" icon={ShieldCheck} />
      <SidebarNavItem collapsed={collapsed} label="Banned Users" href="/admin/banned" icon={Ban} />
      <SidebarNavItem collapsed={collapsed} label="Referrals" href="/admin/referrals" icon={GitBranch} />

      {/* CONTENT */}
      <SidebarSection label="Content" collapsed={collapsed} />
      <SidebarNavItem collapsed={collapsed} label="Review Queue" href="/admin/review-queue" icon={ClipboardList} badge={12} />
      <SidebarNavItem collapsed={collapsed} label="Reported Content" href="/admin/reported" icon={Flag} />
      <SidebarNavItem collapsed={collapsed} label="Auto-Mod Rules" href="/admin/automod" icon={Settings2} />

      {/* FINANCE */}
      <SidebarSection label="Finance" collapsed={collapsed} />
      <SidebarNavItem collapsed={collapsed} label="Transactions" href="/admin/transactions" icon={DollarSign} />
      <SidebarNavItem collapsed={collapsed} label="Payouts" href="/admin/payouts" icon={CreditCard} />
      <SidebarNavItem collapsed={collapsed} label="Payment Gateways" href="/admin/gateways" icon={Landmark} />

      {/* PLATFORM */}
      <SidebarSection label="Platform" collapsed={collapsed} />
      <SidebarNavItem collapsed={collapsed} label="Live Streams" href="/admin/streams" icon={Radio} />
      <SidebarNavItem collapsed={collapsed} label="Messaging" href="/admin/messaging" icon={MessageSquare} />
      <SidebarNavItem collapsed={collapsed} label="Creators & Agencies" href="/admin/creators" icon={Building2} />
      <SidebarNavItem collapsed={collapsed} label="Admins & Roles" href="/admin/admins" icon={UserCog} />
      <SidebarNavItem collapsed={collapsed} label="Settings" href="/admin/settings" icon={Settings} />

      <style jsx>{`
        .sidebar-nav {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding-bottom: 8px;
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.08) transparent;
        }
        .sidebar-nav::-webkit-scrollbar {
          width: 4px;
        }
        .sidebar-nav::-webkit-scrollbar-track {
          background: transparent;
        }
        .sidebar-nav::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.08);
          border-radius: 4px;
        }
      `}</style>
    </nav>
  );
}