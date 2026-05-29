import { HydrationBoundary, dehydrate, QueryClient } from "@tanstack/react-query";
import WalletClient from "./WalletClient";

export default async function WalletPage() {
  const queryClient = new QueryClient();
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <WalletClient />
    </HydrationBoundary>
  );
}