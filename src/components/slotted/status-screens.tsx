export function OpeningScreen() {
  return <main className="min-h-dvh bg-[#F6F5F2]" aria-hidden="true" />;
}

export function SetupScreen({
  sentence,
  step,
}: {
  sentence: string;
  step: string;
}) {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#F6F5F2] px-6 text-[#141413]">
      <div className="w-full max-w-sm text-center">
        <p className="font-mono text-xs font-semibold tracking-tight">slotted</p>
        <h1 className="mt-4 text-xl font-semibold tracking-tight">{sentence}</h1>
        <p className="mt-2 text-sm text-[#575550]">{step}</p>
      </div>
    </main>
  );
}

export function NotReadyScreen() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#F6F5F2] px-6 text-[#141413]">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-xl font-semibold tracking-tight">Not ready yet.</h1>
        <p className="mt-2 text-sm text-[#575550]">Check back in a little while.</p>
      </div>
    </main>
  );
}

export function FailureScreen({
  title,
  onRetry,
}: {
  title: string;
  onRetry?: () => void;
}) {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#F6F5F2] px-6 text-[#141413]">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-[#171715] px-5 text-sm font-semibold text-white"
          >
            Try again
          </button>
        ) : null}
      </div>
    </main>
  );
}
