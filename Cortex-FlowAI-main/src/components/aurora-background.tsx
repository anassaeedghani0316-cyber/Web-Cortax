export function AuroraBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="orb orb-violet" style={{ width: 520, height: 520, top: "-10%", left: "-10%" }} />
      <div className="orb orb-cyan" style={{ width: 460, height: 460, bottom: "-15%", right: "-10%" }} />
      <div className="orb orb-rose" style={{ width: 360, height: 360, top: "40%", right: "30%", opacity: 0.25 }} />
    </div>
  );
}
