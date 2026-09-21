export default function SplashScreen() {
  return (
    <div className="fixed inset-0 z-50 flex min-h-screen flex-col items-center justify-center bg-bg p-6 text-center">
      <img
        src="/assets/logo-on-the-money.svg"
        alt="On The Money"
        className="w-[260px] max-w-full h-auto object-contain"
      />
      <p className="mt-10 text-muted italic text-[13px] leading-relaxed">
        Loading your secure workspace…
      </p>
    </div>
  );
}
