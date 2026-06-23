import logoAsset from "@/assets/logo.jpeg.asset.json";

export function Brand({ size = "md", showText = true }: { size?: "sm" | "md" | "lg"; showText?: boolean }) {
  const dim = size === "sm" ? 32 : size === "lg" ? 56 : 44;
  const text = size === "sm" ? "text-base" : size === "lg" ? "text-2xl" : "text-lg";
  return (
    <div className="flex items-center gap-2.5">
      <img
        src={logoAsset.url}
        alt="Cortex Flow"
        className="shrink-0 rounded-lg object-contain"
        style={{ width: dim, height: dim }}
      />
      {showText && (
        <span className={`font-display font-bold tracking-tight ${text}`}>Cortex Flow</span>
      )}
    </div>
  );
}
