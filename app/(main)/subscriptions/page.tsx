import { HydrationBoundary, dehydrate, QueryClient } from "@tanstack/react-query";
import SubscriptionsClient from "./SubscriptionsClient";

export default async function SubscriptionsPage() {
  const queryClient = new QueryClient();
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SubscriptionsClient />
    </HydrationBoundary>
  );
}