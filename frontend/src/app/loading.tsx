export default function Loading() {
  return (
    <div className="min-h-screen animate-pulse">
      <section className="px-4 pt-12 pb-14 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="h-3 w-32 bg-muted rounded mb-4" />
          <div className="h-10 w-80 bg-muted rounded mb-3" />
          <div className="h-5 w-64 bg-muted rounded mb-10" />
          <div className="flex gap-10">
            <div className="h-14 w-24 bg-muted rounded" />
            <div className="h-14 w-24 bg-muted rounded" />
            <div className="h-14 w-24 bg-muted rounded" />
          </div>
        </div>
      </section>
      <div className="px-4 pb-12 sm:px-6 max-w-7xl mx-auto">
        <div className="h-40 bg-muted rounded-xl mb-8" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
