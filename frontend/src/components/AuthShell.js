// Shared layout for Sign In and Sign Up:
// full-screen campus photo, heading on the left, white card on the right.

const bgClass = "absolute inset-0 bg-cover bg-[20%_60%] scale-100";
const overlayClass = "absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-[#1B2A4A]/90 via-[#1B2A4A]/45 to-[#1B2A4A]/15";
const contentClass = "relative z-10 min-h-screen flex flex-col md:flex-row md:items-center md:justify-between gap-10 px-6 py-10 md:px-16 lg:px-24";
const cardClass = "w-full max-w-[380px] mx-auto md:mx-0 bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl shadow-black/30 border border-white/60 p-7 md:p-8 animate-[fadeInUp_0.6s_ease-out]";

export default function AuthShell({ children }) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#1B2A4A]">
      <div className={bgClass} style={{ backgroundImage: "url('/hero.jpg')" }} />
      <div className={overlayClass} />

      <div className={contentClass}>
        <div className="text-white max-w-lg md:self-end md:pb-10 animate-[fadeInUp_0.6s_ease-out]">
          <h1 className="font-display text-4xl md:text-6xl font-semibold leading-tight mb-4 drop-shadow-lg">Begin Your<br />Medicaps Journey</h1>
          <p className="text-white/85 max-w-md text-[15px] md:text-base leading-relaxed drop-shadow">Apply, track your application, and take the next step toward your degree — all in one place.</p>
        </div>

        <div className={cardClass}>{children}</div>
      </div>
    </div>
  );
}