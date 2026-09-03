import Image from "next/image";

const RATIO = 2172 / 724; // intrinsic logo aspect ratio

/**
 * The Stackceipt wordmark (mark + name). Renders the uploaded logo via next/image
 * so it is automatically optimized and resized. Set `height` to control display size;
 * width is derived from the logo's aspect ratio.
 */
export function Wordmark({ height = 24, className }: { height?: number; className?: string }) {
  const width = Math.round(height * RATIO);
  return (
    <Image
      src="/images/logo.png"
      alt="Stackceipt"
      width={width}
      height={height}
      priority
      className={className}
    />
  );
}
