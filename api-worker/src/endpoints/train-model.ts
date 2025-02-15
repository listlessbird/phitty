import { Arr, OpenAPIRoute } from "chanfana"
import { Context } from "hono"
import { APIWorkerEnv, Job, JobStages } from "types"
import { z } from "zod"

export class TrainModel extends OpenAPIRoute {
  schema = {
    tags: ["Train a LORA"],
    summary: "Train a LORA model",
    request: {
      body: {
        content: {
          "multipart/form-data": {
            schema: z.object({
              images: z
                .instanceof(File)
                .array()
                .openapi({
                  type: "array",
                  items: {
                    type: "string",
                    format: "binary",
                  },
                })
                .describe("Image files to upload (JPEG, PNG, or WEBP)"),
            }),
            encoding: {
              images: {
                contentType: "image/jpeg, image/png, image/webp",
              },
            },
          },
        },
      },
    },
    responses: {
      "200": {
        description: "Files uploaded successfully",
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean(),
              result: z.object({
                files: z.array(
                  z.object({
                    name: z.string(),
                    type: z.string(),
                    size: z.number(),
                  })
                ),
              }),
            }),
          },
        },
      },
      "400": {
        description: "Invalid request",
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean(),
              error: z.string(),
            }),
          },
        },
      },
    },
  }

  async handle(c: Context<{ Bindings: APIWorkerEnv }>) {
    const formData = await c.req.formData()
    const files = formData.getAll("images") as File[]

    if (!files.length) {
      return c.json(
        {
          success: false,
          error: "No images provided",
        },
        400
      )
    }

    const validTypes = ["image/jpeg", "image/png", "image/webp"]
    const invalidFile = files.find((file) => !validTypes.includes(file.type))
    if (invalidFile) {
      return c.json(
        {
          success: false,
          error: `Invalid file type: ${invalidFile.type}`,
        },
        400
      )
    }
    const packName =
      ["cat", "dog", "bird", "fish", "horse", "cow", "sheep"][
        Math.floor(Math.random() * 7)
      ] +
      "-" +
      Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, "0")

    console.log("packname", packName)

    const processedFiles = await Promise.all(
      files.map(async (file, index) => {
        const arrayBuffer = await file.arrayBuffer()

        // put to r2 under a folder `train/packName/01.png`
        const key = `train/${packName}/${index + 1}.${file.type.split("/")[1]}`
        await c.env.R2.put(key, arrayBuffer, {
          customMetadata: {
            pack_name: packName,
          },
        })

        return {
          name: file.name,
          type: file.type,
          size: file.size,
        }
      })
    )

    const job = {
      packName,
      imageCount: files.length,
      stage: "yet-to-zip",
    } satisfies Job<"yet-to-zip">

    c.executionCtx.waitUntil(
      c.env.phitty_kv
        .put(`job-${packName}`, JSON.stringify(job), {
          metadata: {
            stage: "yet-to-zip",
          } as { stage: JobStages },
        })
        .then(() => {
          console.log("Job queued", `job-${packName}`)
        })
        .catch((err) => {
          console.error("Error queuing job", err)
        })
    )

    return c.json({
      success: true,
      result: {
        files: processedFiles,
      },
    })
  }
}
