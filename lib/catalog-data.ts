import sbc from "../data/catalog/sbc.json";
import sbem from "../data/catalog/sbem.json";
import { catalogSchema } from "./catalog-schema";

// Validate on import so invalid data fails before reaching application consumers.
export const sbcCatalog = catalogSchema.parse(sbc);
export const sbemCatalog = catalogSchema.parse(sbem);
