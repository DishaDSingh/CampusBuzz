import type { ProductTypeKey } from "./rules";

/** Product types with real photo mockups (all of them now). Plain module so server pages can call it too. */
export const hasPhotoMockup = (type: ProductTypeKey) => ["hoodie", "tshirt", "cap", "tote", "mug"].includes(type);
