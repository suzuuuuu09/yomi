// import "@dotenvx/dotenvx/config";
import { OpenAPIHono } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { cors } from "hono/cors";
import type { Env } from "@/types";
import searchApp from "@/routes/search";

const app = new OpenAPIHono<Env>();

// CORSの設定
app.use(
	"*",
	cors({
		origin: "*", // すべてのオリジンを許可
		credentials: true, // クレデンシャルを許可
		allowHeaders: ["Content-Type", "Authorization"], // 許可するヘッダー
		allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // 許可するHTTPメソッド
	}),
);

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
app.get("/docs", swaggerUI({ url: "/openapi.json" }));

export default app;
