"use client";

import { usePathname } from "next/navigation";
import { MessagesSidebar } from "@/components/messages/MessagesSidebar";
import { DUMMY_CONVERSATIONS } from "@/app/(main)/messages/page";

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const inChat   = pathname !== "/messages";

  return (
    <div
      style={{
        display:         "flex",
        height:          "100vh",
        backgroundColor: "#0A0A0F",
        overflow:        "hidden",
        width:           "100%",
        fontFamily:      "'Inter', sans-serif",
        paddingTop:      "env(safe-area-inset-top, 44px)",
        boxSizing:       "border-box",
      }}
    >
      <style>{`
        .main-scroll { padding-top: 0 !important; }
        .msg-sidebar-wrap {
          display: flex;
          width: 380px;
          flex-shrink: 0;
          height: 100%;
        }
        .msg-chat-wrap {
          display: flex;
          flex: 1;
          flex-direction: column;
          overflow: hidden;
        }
        @media (max-width: 767px) {
          .msg-sidebar-wrap {
            display: ${inChat ? "none" : "flex"} !important;
            width: 100% !important;
          }
          .msg-chat-wrap {
            display: ${inChat ? "flex" : "none"} !important;
            width: 100% !important;
          }
        }
      `}</style>

      <div className="msg-sidebar-wrap">
        <MessagesSidebar
          conversations={DUMMY_CONVERSATIONS}
          activeId={null}
        />
      </div>

      <div className="msg-chat-wrap">
        {children}
      </div>
    </div>
  );
}