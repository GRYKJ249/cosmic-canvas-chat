type OperaLogoMarkProps = {
  className?: string;
  label?: string;
  animated?: boolean;
};

export function OperaLogoMark({ className = "h-10 w-10", label, animated = true }: OperaLogoMarkProps) {
  return (
    <span
      className={`opera-logo-mark ${animated ? "opera-logo-mark--animated" : ""} ${className}`}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <span className="opera-logo-ring opera-logo-ring--outer" />
      <span className="opera-logo-ring opera-logo-ring--inner" />
      <span className="opera-logo-core" />
    </span>
  );
}