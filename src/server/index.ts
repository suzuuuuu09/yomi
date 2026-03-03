import { OpenAPIHono } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import searchApp from "@/server/routes/search";
import authApp from "@/server/routes/auth";

const app = new OpenAPIHono().basePath("/api");

// NOTE: 同じドメインなのでCORSは必要ない
/* app.use(
  "*",
  cors({
    origin: "*",
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  }),
); */
app.route("/auth", authApp);
app.route("/search", searchApp);

app.get("/", (c) => {
  return c.text("Hello, YOMi API!");
});
app.doc("/openapi.json", {
  openapi: "3.0.0",
  info: {
    title: "YOMi API",
    version: "1.0.0",
    description: "YOMiで使われているAPIのドキュメントです。",
  },
});
app.get("/docs", swaggerUI({ url: "/api/openapi.json" }));

export default app;
