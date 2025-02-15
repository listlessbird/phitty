import { fromHono } from "chanfana"
import { Hono } from "hono"
import { TaskCreate } from "./endpoints/taskCreate"
import { TaskDelete } from "./endpoints/taskDelete"
import { TaskFetch } from "./endpoints/taskFetch"
import { TaskList } from "./endpoints/taskList"
import { TrainModel } from "./endpoints/train-model"
import { APIWorkerEnv } from "./types"

const app = new Hono<{ Bindings: APIWorkerEnv }>()

const openapi = fromHono(app, {
  docs_url: "/",
})

openapi.get("/api/tasks", TaskList)
openapi.post("/api/tasks", TaskCreate)
openapi.post("/api/train-model", TrainModel)
openapi.get("/api/tasks/:taskSlug", TaskFetch)
openapi.delete("/api/tasks/:taskSlug", TaskDelete)

export default app
