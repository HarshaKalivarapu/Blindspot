function WarningModal({ onConfirm, onCancel }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="warning-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-2xl border border-red-500/40 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/15 text-red-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-6 w-6"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M9.401 2.603a3 3 0 0 1 5.198 0l7.28 12.608a3 3 0 0 1-2.599 4.5H4.72a3 3 0 0 1-2.599-4.5L9.4 2.603ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8Z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h2
            id="warning-title"
            className="text-lg font-semibold tracking-tight text-red-400"
          >
            WARNING
          </h2>
        </div>

        <p className="text-sm leading-relaxed text-slate-200">
          Active scanning aggressively probes your target's ports, services, and potential vulnerabilities. Only proceed on systems you own or have explicit written authorization to test — unauthorized scanning is prohibited and may violate applicable laws. If you're not authorized, go back to the dashboard.
        </p>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
          >
            Back to Dashboard
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
          >
            Yes, I am authorized
          </button>
        </div>
      </div>
    </div>
  )
}

export default WarningModal
