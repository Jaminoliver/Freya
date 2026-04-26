// app/(main)/posts/[postId]/page.tsx
"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import PostView from "@/components/shared/PostView";

export default function SinglePostPage() {
  const rawParams       = useParams();
  const router          = useRouter();
  const searchParams    = useSearchParams();
  const postId          = rawParams?.postId as string | undefined;
  const sourceIsMessage = searchParams?.get("source") === "message";
  const fromSaved       = searchParams?.get("from") === "saved";

  if (!postId) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "12px" }}>
        <p style={{ color: "#F1F5F9", fontSize: "18px", fontWeight: 700 }}>Post not found</p>
        <button onClick={() => router.back()} style={{ color: "#8B5CF6", background: "none", border: "none", cursor: "pointer", fontSize: "14px" }}>Go back</button>
      </div>
    );
  }

  return (
    <PostView
      postId={postId}
      sourceIsMessage={sourceIsMessage}
      onBack={() => router.back()}
    />
  );
}