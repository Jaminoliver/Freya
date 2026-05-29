import { HydrationBoundary, dehydrate, QueryClient } from "@tanstack/react-query";
import ExploreClient from "./ExploreClient";

export default async function ExplorePage() {
  const queryClient = new QueryClient();

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ExploreClient />
    </HydrationBoundary>
  );
}