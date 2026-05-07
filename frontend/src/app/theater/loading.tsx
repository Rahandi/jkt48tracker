export default function Loading() {
  return (
    <div className="min-h-screen animate-pulse">
      <div className="px-4 py-6 sm:px-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="h-7 w-40 bg-muted rounded" />
          <div className="h-4 w-20 bg-muted rounded" />
        </div>
        <div className="flex gap-2 mb-6">
          <div className="h-9 w-32 bg-muted rounded-full" />
          <div className="h-9 w-28 bg-muted rounded-full" />
        </div>
        <div className="grid lg:grid-cols-[1fr_300px] gap-6">
          <div className="flex flex-col gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded-xl" />
            ))}
          </div>
          <div className="h-80 bg-muted rounded-xl" />
        </div>
      </div>
    </div>
  );
}
