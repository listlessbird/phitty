import { DateTime, Str } from "chanfana"
import exp from "constants"
import { z } from "zod"

export const Task = z.object({
  name: Str({ example: "lorem" }),
  slug: Str(),
  description: Str({ required: false }),
  completed: z.boolean().default(false),
  due_date: DateTime(),
})

export type APIWorkerEnv = {
  R2: R2Bucket
  phitty_kv: KVNamespace
}

export type JobStages =
  | "yet-to-zip"
  | "zipping"
  | "zipped"
  | "sent-to-train"
  | "trained"
  | "done"
