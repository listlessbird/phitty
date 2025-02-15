import { DateTime, Str } from "chanfana"
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
  | "zipped"
  | "sent-to-train"
  | "trained"
  | "done"

export type Job<Stage extends JobStages = JobStages> = {
  packName: string
  imageCount: number
  stage: Stage
} & (Stage extends "zipped" | "sent-to-train"
  ? {
      zipKeyinR2: string
    }
  : {})
