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

  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-card",
        className,
      )}
      aria-hidden="true"
    >
      {product?.icon ? (
        <svg viewBox="0 0 24 24" className="size-5" style={{ color: `#${product.icon.hex}` }}>
          <path fill="currentColor" d={product.icon.path} />
        </svg>
      ) : (
        <span className="text-xs font-semibold text-muted-foreground">
          {(productName || vendorName).slice(0, 2).toUpperCase()}
        </span>
      )}
    </span>
  );
}
