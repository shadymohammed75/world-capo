// Uses Twemoji CDN so flag emoji render correctly on all platforms (including Linux).
// Converts a flag emoji string → its Unicode codepoints → the SVG URL.
export function flagUrl(emoji: string): string {
  const pts = [...emoji]
    .map(c => c.codePointAt(0)!.toString(16))
    .join("-");
  return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${pts}.svg`;
}

interface FlagImgProps {
  emoji: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  alt?: string;
}

export function FlagImg({ emoji, size = 32, className = "", style, alt = "" }: FlagImgProps) {
  return (
    <img
      src={flagUrl(emoji)}
      alt={alt}
      width={size}
      height={size}
      draggable={false}
      className={className}
      style={{ display: "inline-block", objectFit: "contain", ...style }}
    />
  );
}
