import { Skeleton } from "@/components/ui/skeleton";

const PipelinesSkeleton = () => (
  <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-44" />
      </div>
      <Skeleton className="h-9 w-36 rounded-md" />
    </div>
    <div className="flex gap-3 flex-wrap">
      <Skeleton className="h-9 flex-1 min-w-[200px] rounded-md" />
      <Skeleton className="h-9 w-64 rounded-md" />
      <Skeleton className="h-9 w-40 rounded-md" />
    </div>
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-3 border-b border-border last:border-0">
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4" />
        </div>
      ))}
    </div>
  </div>
);

export default PipelinesSkeleton;
