import { z } from "zod";

type UnderscoreID<T extends Record<string, any>> = Omit<T, "id"> & { _id: T["id"] };

const zodId = (): z.ZodString => z.string().regex(/^[a-f\d]{24}$/i, "invalid id");

export { zodId };
export type { UnderscoreID };
