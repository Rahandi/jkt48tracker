export default function Loading() {
  return (
    <div className="min-h-screen animate-pulse">
      <div className="px-4 py-6 sm:px-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="h-7 w-28 bg-muted rounded" />
          <div className="h-4 w-16 bg-muted rounded" />
        </div>
        <div className="flex gap-2 mb-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 w-24 bg-muted rounded-full" />
          ))}
        </div>
        <div className="h-9 w-64 bg-muted rounded-lg mb-6" />
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9 gap-3">
          {Array.from({ length: 27 }).map((_, i) => (
            <div key={i} className="rounded-xl overflow-hidden">
              <div className="aspect-[3/4] bg-muted" />
              <div className="p-2">
                <div className="h-2.5 bg-muted rounded w-full mb-1" />
                <div className="h-2 bg-muted rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
