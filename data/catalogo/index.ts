import sbc from "./sbc.json";
import sbem from "./sbem.json";
import { catalogSchema } from "./schema";

// Validar antes de disponibilizar os registros aos consumidores existentes.
export const sbcCatalog = catalogSchema.parse(sbc);
export const sbemCatalog = catalogSchema.parse(sbem);
