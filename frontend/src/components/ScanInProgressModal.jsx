export default function ScanInProgressModal({ onStay, onLeave }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scan-inprogress-title"
    >
      <div className="w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-amber-500/15 flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-400" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <h2 id="scan-inprogress-title" className="text-lg font-semibold tracking-tight text-amber-400">
            Scan in Progress
          </h2>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-slate-200">
          Your scan is still running. If you leave now, the results will not be saved and you will lose all progress.
        </p>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onLeave}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
          >
            Leave anyway
          </button>
          <button
            onClick={onStay}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-amber-600 text-white hover:bg-amber-500"
          >
            Stay on page
          </button>
        </div>
      </div>
    </div>
  )
}
