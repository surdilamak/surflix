/**
 * Skeleton loaders — placeholder pas data loading
 */
'use client';

export function PosterSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[2/3] w-full rounded-ios bg-white/[0.04]" />
      <div className="mt-2 space-y-1.5">
        <div className="h-3 w-3/4 rounded-full bg-white/[0.04]" />
        <div className="h-2.5 w-1/2 rounded-full bg-white/[0.04]" />
      </div>
    </div>
  );
}

export function PosterGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
      {Array.from({ length: count }).map((_, i) => (
        <PosterSkeleton key={i} />
      ))}
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div className="relative h-[260px] w-full overflow-hidden bg-white/[0.04] md:h-[320px] animate-pulse">
      <div className="absolute inset-x-0 bottom-0 p-5 md:p-7">
        <div className="h-7 w-2/3 rounded-full bg-white/[0.08]" />
        <div className="mt-2 h-3 w-1/3 rounded-full bg-white/[0.06]" />
        <div className="mt-4 flex gap-2">
          <div className="h-9 w-24 rounded-full bg-white/[0.08]" />
          <div className="h-9 w-24 rounded-full bg-white/[0.06]" />
        </div>
      </div>
    </div>
  );
}
