export default function LessonsLoading() {
  return (
    <main
      aria-busy="true"
      aria-label="Loading lessons"
      className="mx-auto max-w-5xl space-y-5 px-4 py-10"
    >
      <p role="status" className="text-sm text-zinc-600">
        Loading your lessons…
      </p>
      <div className="h-56 animate-pulse rounded-3xl bg-emerald-100/60 motion-reduce:animate-none" />
      <div className="h-80 animate-pulse rounded-3xl bg-zinc-100 motion-reduce:animate-none dark:bg-white/10" />
    </main>
  );
}
