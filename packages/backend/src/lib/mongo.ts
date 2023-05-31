import { z } from "zod";
import { ObjectId, Db, Collection } from "mongodb";

type UnderscoreID<T extends Record<string, any>> = Omit<T, "id"> & { _id: T["id"] };

const zodId = (): z.ZodString => z.string().regex(/^[a-f\d]{24}$/i, "invalid id");

export { zodId, ObjectId };
export type { UnderscoreID, Db, Collection };
