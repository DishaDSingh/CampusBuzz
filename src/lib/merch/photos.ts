import type { ProductTypeKey } from "./rules";

/** Product types with real photo mockups. Plain module so server pages can call it too. */
export const hasPhotoMockup = (type: ProductTypeKey) => type === "hoodie" || type === "tshirt";
