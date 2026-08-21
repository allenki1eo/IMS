export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-black flex items-center justify-center p-4 overflow-hidden">
      {/* Ambient grid */}
      <div className="absolute inset-0 vercel-grid [mask-image:radial-gradient(ellipse_70%_60%_at_50%_40%,black,transparent)]" />
      {/* Blue glow from the top */}
      <div className="absolute inset-0 vercel-glow" />
      <div className="relative z-10 w-full flex justify-center">{children}</div>
    </div>
  );
}
