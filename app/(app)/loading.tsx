export default function ChatLoading() {
  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-4 px-4 py-6" aria-busy aria-label="Loading conversation">
      <div className="h-10 w-2/3 animate-pulse rounded-2xl bg-muted" />
      <div className="h-24 w-full animate-pulse rounded-2xl bg-muted" />
      <div className="ml-auto h-10 w-1/2 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}
