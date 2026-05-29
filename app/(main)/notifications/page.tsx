import { HydrationBoundary, dehydrate, QueryClient } from "@tanstack/react-query";
import NotificationsClient from "./NotificationsClient";

export default async function NotificationsPage() {
  const queryClient = new QueryClient();

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <NotificationsClient />
    </HydrationBoundary>
  );
}