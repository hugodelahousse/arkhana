import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  layout("routes/_shell.tsx", [
    index("routes/home.tsx"),
    route("collection", "routes/collection.tsx"),
    route("collection/:slug", "routes/collection.$slug.tsx"),
    route("settings", "routes/settings.tsx"),
    route("streak", "routes/streak.tsx"),
    route("history", "routes/history.tsx"),
    route("spread/:type/:date", "routes/spread.$type.$date.tsx"),
  ]),
  route("spread/:type", "routes/spread.$type.tsx"),
  route("u/:username", "routes/u.$username.tsx"),
  route("u/:username/pull/:date", "routes/u.$username.pull.$date.tsx"),
  route("share/:pullId", "routes/share.$pullId.tsx"),
  route("s/:id", "routes/s.$id.tsx"),
  route("api/og.png", "routes/api.og.tsx"),
  route("auth/signin", "routes/auth/signin.tsx"),
  route("auth/signup", "routes/auth/signup.tsx"),
  route("auth/signout", "routes/auth/signout.tsx"),
  route("auth/forgot-password", "routes/auth/forgot-password.tsx"),
  route("auth/reset-password", "routes/auth/reset-password.tsx"),
  route("lab/cards", "routes/lab/cards.tsx"),
  route("lab/spreads", "routes/lab/spreads.tsx"),
  route("lab/layers", "routes/lab/layers.tsx"),
  route("lab/push", "routes/lab/push.tsx"),
] satisfies RouteConfig;
