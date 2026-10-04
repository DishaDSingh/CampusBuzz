import type { Metadata } from "next";
import Link from "next/link";
import { ArchiveIcon, ClipboardListIcon, PackageIcon, PaletteIcon, PlusIcon, ShirtIcon } from "lucide-react";
import { db } from "@/lib/db";
import { can, requireUser } from "@/lib/auth/current-user";
import { EmptyState, PageHeader, PageTabs, activeTab } from "@/components/common";
import { ArchiveProductButton } from "./merch-forms";
import { MockupFace, PhotoMockup } from "@/components/merch/mockup";
import { hasPhotoMockup } from "@/lib/merch/photos";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatINR, standing } from "@/lib/membership/rules";
import { mockupProps } from "@/lib/merch/art";

export const metadata: Metadata = { title: "Merch" };

const designSelect = {
  productType: true,
  baseColor: true,
  inkColor: true,
  artworkSvg: true,
  logoUploadId: true,
  frontText: true,
  backText: true,
} as const;

export default async function MerchStorePage(props: PageProps<"/merch">) {
  const user = await requireUser();
  const staff = can(user, "merchandise.view");
  // Staff can open the archive: products hidden from the store for now.
  const tab = staff ? activeTab(["store", "archived"] as const, (await props.searchParams).tab) : "store";
  const manage = can(user, "merchandise.manage_products");

  const [products, terms, pendingOrders, lowStock, archivedCount] = await Promise.all([
    db.product.findMany({
      where: tab === "archived" ? { status: "ARCHIVED" } : staff ? { status: { not: "ARCHIVED" } } : { status: "ACTIVE" },
      orderBy: [{ status: "asc" }, { name: "asc" }],
      include: {
        design: { select: designSelect },
        variants: { where: { isActive: true }, select: { colorHex: true, stock: true, reorderLevel: true, size: true } },
      },
    }),
    db.membership.findMany({ where: { userId: user.id }, select: { status: true, startDate: true, endDate: true } }),
    staff ? db.merchOrder.count({ where: { status: { in: ["PENDING_PAYMENT", "PAID"] } } }) : 0,
    staff
      ? db.productVariant.count({
          where: { isActive: true, product: { status: "ACTIVE" }, stock: { lte: db.productVariant.fields.reorderLevel } },
        })
      : 0,
    staff ? db.product.count({ where: { status: "ARCHIVED" } }) : 0,
  ]);
  const state = standing(terms).state;
  const isMember = state === "ACTIVE" || state === "EXPIRING";

  return (
    <>
      <PageHeader
        title="Merch"
        description={isMember ? "Member prices applied — 15% off everything." : "Official merchandise. Members get 15% off."}
        actions={
          staff && (
            <>
              <Button variant="outline" asChild>
                <Link href="/merch/orders">
                  <ClipboardListIcon /> Orders{pendingOrders ? ` (${pendingOrders})` : ""}
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/merch/inventory">
                  <PackageIcon /> Inventory{lowStock ? ` · ${lowStock} low` : ""}
                </Link>
              </Button>
              {can(user, "merchandise.studio") && (
                <Button variant="outline" asChild>
                  <Link href="/merch/studio">
                    <PaletteIcon /> Studio
                  </Link>
                </Button>
              )}
              {can(user, "merchandise.manage_products") && (
                <Button asChild>
                  <Link href="/merch/new">
                    <PlusIcon /> New product
                  </Link>
                </Button>
              )}
            </>
          )
        }
      />

      {staff && (
        <PageTabs
          basePath="/merch"
          current={tab}
          tabs={[
            { key: "store", label: "In store" },
            { key: "archived", label: "Archived", count: archivedCount || undefined },
          ]}
        />
      )}

      {products.length === 0 ? (
        tab === "archived" ? (
          <EmptyState icon={ArchiveIcon} title="Nothing archived">
            Archive a product from its page to hide it from the store for a while.
          </EmptyState>
        ) : (
          <EmptyState icon={ShirtIcon} title="Nothing in the store yet" />
        )
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => {
            const art = mockupProps(p);
            const inStock = p.variants.reduce((s, v) => s + v.stock, 0);
            const low = p.variants.filter((v) => v.stock <= v.reorderLevel).length;
            return (
              <li key={p.id}>
                <Link
                  href={`/merch/${p.id}`}
                  className={cn(
                    "group bg-card hover:border-primary/40 block overflow-hidden rounded-xl border transition-colors",
                    p.status !== "ACTIVE" && "opacity-70",
                  )}
                >
                  {hasPhotoMockup(art.type) ? (
                    <PhotoMockup
                      type={art.type}
                      color={art.color}
                      {...art.front}
                      crop="square"
                      className="rounded-none transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="from-muted/60 to-background aspect-square bg-linear-to-b p-6">
                      <MockupFace
                        type={art.type}
                        side="front"
                        color={art.color}
                        {...art.front}
                        className="transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  )}
                  <div className="border-t p-4">
                    <p className="flex items-center gap-2 font-medium">
                      {p.name}
                      {p.status === "DRAFT" && <span className="text-muted-foreground text-xs font-normal">Draft</span>}
                    </p>
                    <p className="mt-1 flex items-baseline gap-2 text-sm">
                      <span className="font-semibold tabular-nums">{formatINR(isMember ? p.memberPricePaise : p.publicPricePaise)}</span>
                      {isMember && p.memberPricePaise < p.publicPricePaise && (
                        <span className="text-muted-foreground text-xs line-through">{formatINR(p.publicPricePaise)}</span>
                      )}
                      <span className={cn("ml-auto text-xs", inStock ? "text-muted-foreground" : "text-destructive")}>
                        {inStock
                          ? staff && low
                            ? `${low} sizes low`
                            : `${new Set(p.variants.filter((v) => v.stock > 0).map((v) => v.size)).size} sizes`
                          : "Sold out"}
                      </span>
                    </p>
                  </div>
                </Link>
                {p.status === "ARCHIVED" && manage && (
                  <div className="mt-2">
                    <ArchiveProductButton productId={p.id} name={p.name} archived />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
