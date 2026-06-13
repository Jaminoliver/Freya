import { FeedSkeleton } from "@/components/loadscreen/FeedSkeleton";

export default function Loading() {
  return <FeedSkeleton count={5} includeStoryBar />;
}