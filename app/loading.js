export default function Loading() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#081318] text-white">
      <div className="flex items-center gap-3 text-sm text-white/60">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
        Opening Wavely…
      </div>
    </main>
  );
}
