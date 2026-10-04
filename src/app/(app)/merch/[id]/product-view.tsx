"use client";

import { useState } from "react";
import { MerchPreview } from "@/components/merch/mockup";
import type { ProductTypeKey } from "@/lib/merch/rules";
import { BuyMerchPanel } from "../merch-forms";

type Art = { artwork?: string | null; text?: string | null; ink?: string };

/** Preview + buy panel share the selected colour, so the 3D mockup recolours live. */
export function ProductView({
  art,
  variants,
  pricePaise,
  publicPricePaise,
  isMember,
  buyable,
  archived = false,
}: {
  art: { type: ProductTypeKey; color: string; front: Art; back: Art };
  variants: { id: string; size: string; color: string; colorHex: string; stock: number }[];
  pricePaise: number;
  publicPricePaise: number;
  isMember: boolean;
  buyable: boolean;
  archived?: boolean;
}) {
  const [color, setColor] = useState(art.color);
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <MerchPreview type={art.type} color={color} front={art.front} back={art.back} />
      <div>
        {buyable ? (
          <BuyMerchPanel
            variants={variants}
            pricePaise={pricePaise}
            publicPricePaise={publicPricePaise}
            isMember={isMember}
            onColor={setColor}
          />
        ) : (
          <p className="text-muted-foreground text-sm">{archived ? "Archived — not on sale right now." : "Not on sale yet."}</p>
        )}
      </div>
    </div>
  );
}
