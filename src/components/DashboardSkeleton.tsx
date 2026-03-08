import { Skeleton } from "@/components/ui/skeleton";

const DashboardSkeleton = () => (
  <div className="p-6 lg:p-8 space-y-8 animate-fade-in">
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>
      <Skeleton className="h-8 w-36 rounded-md" />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-28 rounded-lg" />
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Skeleton className="h-48 rounded-lg" />
      <Skeleton className="lg:col-span-2 h-48 rounded-lg" />
    </div>
  </div>
);

export default DashboardSkeleton;
