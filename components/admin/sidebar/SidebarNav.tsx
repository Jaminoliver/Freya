"use client";

import SidebarSection                    from "./SidebarSection";
import SidebarAnalyticsDropdown          from "./SidebarAnalyticsDropdown";
import SidebarUsersDropdown              from "./SidebarUsersDropdown";
import SidebarContentModerationDropdown  from "./SidebarContentModerationDropdown";
import SidebarFinanceDropdown            from "./SidebarFinanceDropdown";
import SidebarSubscriptionDropdown       from "./SidebarSubscriptionDropdown";
import SidebarMessagingDropdown          from "./SidebarMessagingDropdown";
import SidebarPlatformSettingsDropdown   from "./SidebarPlatformSettingsDropdown";
import SidebarAdminRolesDropdown         from "./SidebarAdminRolesDropdown";
import SidebarCreatorsAgenciesDropdown   from "./SidebarCreatorsAgenciesDropdown";
import SidebarLiveStreamingDropdown      from "./SidebarLiveStreamingDropdown";

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
      <SidebarUsersDropdown collapsed={collapsed} />

      {/* CONTENT */}
      <SidebarSection label="Content" collapsed={collapsed} />
      <SidebarContentModerationDropdown collapsed={collapsed} />

      {/* FINANCE */}
      <SidebarSection label="Finance" collapsed={collapsed} />
      <SidebarFinanceDropdown collapsed={collapsed} />

      {/* SUBSCRIPTIONS */}
      <SidebarSection label="Subscriptions" collapsed={collapsed} />
      <SidebarSubscriptionDropdown collapsed={collapsed} />

      {/* MESSAGING */}
      <SidebarSection label="Messaging" collapsed={collapsed} />
      <SidebarMessagingDropdown collapsed={collapsed} />

      {/* CREATORS */}
      <SidebarSection label="Creators" collapsed={collapsed} />
      <SidebarCreatorsAgenciesDropdown collapsed={collapsed} />

      {/* LIVE */}
      <SidebarSection label="Live" collapsed={collapsed} />
      <SidebarLiveStreamingDropdown collapsed={collapsed} />

      {/* PLATFORM */}
      <SidebarSection label="Platform" collapsed={collapsed} />
      <SidebarPlatformSettingsDropdown collapsed={collapsed} />

      {/* ADMIN */}
      <SidebarSection label="Admin" collapsed={collapsed} />
      <SidebarAdminRolesDropdown collapsed={collapsed} />

      <style jsx>{`
        .sidebar-nav {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding-bottom: 8px;
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.08) transparent;
        }
        .sidebar-nav::-webkit-scrollbar { width: 4px; }
        .sidebar-nav::-webkit-scrollbar-track { background: transparent; }
        .sidebar-nav::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.08);
          border-radius: 4px;
        }
      `}</style>
    </nav>
  );
}