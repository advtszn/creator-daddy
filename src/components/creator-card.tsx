import type { Creator } from "~/types";
import { cn } from "~/lib/utils";

type CreatorCardProps = {
  creator: Creator;
  className?: string;
};

function formatFollowers(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}K`;
  }
  return count.toString();
}

export function CreatorCard({ creator, className }: CreatorCardProps) {
  const weightedSimilarityPercent = Math.round(
    creator.weightedSimilarity * 100,
  );

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-border bg-card p-4",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <img
          src={creator.profileImage}
          alt={creator.creatorName}
          className="size-12 rounded-full object-cover"
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-medium text-card-foreground">
            {creator.creatorName}
          </span>
          <span className="text-muted-foreground text-sm">
            @{creator.handle}
          </span>
        </div>
        <span className="shrink-0 text-muted-foreground text-xs">
          {weightedSimilarityPercent}%
        </span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-xs">
          {formatFollowers(creator.followersCount)} followers
        </span>
      </div>
    </div>
  );
}

type CreatorGridProps = {
  creators: Creator[];
  className?: string;
};

export function CreatorGrid({ creators, className }: CreatorGridProps) {
  if (creators.length === 0) {
    return (
      <div className="text-muted-foreground text-sm">No creators found.</div>
    );
  }

  return (
    <div className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {creators.map((creator) => (
        <CreatorCard key={creator._id} creator={creator} />
      ))}
    </div>
  );
}
