import { PRODUCT_CATALOG } from "@/lib/product-catalog";
import { cn } from "@/lib/utils";

export function ProductMark({
  productName,
  vendorName,
  className,
}: {
  productName: string;
  vendorName: string;
  className?: string;
}) {
  const productKey = productName.trim().toLowerCase();
  const vendorKey = vendorName.trim().toLowerCase();
  const product =
    PRODUCT_CATALOG.find((item) => item.name.toLowerCase() === productKey) ??
    PRODUCT_CATALOG.find(
      (item) =>
        item.name.toLowerCase() === vendorKey || item.vendor.toLowerCase() === vendorKey,
    );
  const darkBrand = product?.icon ? isDarkHex(product.icon.hex) : false;

  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-card dark:border-white/15 dark:bg-white/10 dark:backdrop-blur-sm",
        className,
      )}
      aria-hidden="true"
    >
      {product?.icon ? (
        <svg viewBox="0 0 24 24" className={cn("size-5", darkBrand && "dark:invert")} style={{ color: `#${product.icon.hex}` }}>
          <path fill="currentColor" d={product.icon.path} />
        </svg>
      ) : (
        <span className="text-xs font-semibold text-muted-foreground dark:text-white/80">
          {(productName || vendorName).slice(0, 2).toUpperCase()}
        </span>
      )}
    </span>
  );
}

function isDarkHex(hex: string): boolean {
  const value = hex.replace("#", "");
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return red * 0.299 + green * 0.587 + blue * 0.114 < 70;
}
