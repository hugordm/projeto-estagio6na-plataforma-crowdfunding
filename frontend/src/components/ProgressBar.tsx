// Barra de progresso da arrecadação. O percentual pode passar de 100 (meta superada),
// mas a barra visual fica limitada a 100%.
export function ProgressBar({ progress }: { progress: number }) {
  const width = Math.min(100, Math.max(0, progress));

  return (
    <div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-zinc-200"
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full rounded-full bg-emerald-600" style={{ width: `${width}%` }} />
      </div>
      <p className="mt-1 text-xs text-zinc-600">
        {progress.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% da meta
      </p>
    </div>
  );
}
