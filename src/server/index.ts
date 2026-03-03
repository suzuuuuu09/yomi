import { OpenAPIHono } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import searchApp from "@/server/routes/search";
import authApp from "@/server/routes/auth";
import booksApp from "@/server/routes/books";

const app = new OpenAPIHono().basePath("/api");

// NOTE: 同じドメインなのでCORSは必要ない

app.route("/auth", authApp);
app.route("/search", searchApp);
app.route("/books", booksApp);

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
