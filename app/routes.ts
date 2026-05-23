import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("collection", "routes/collection.tsx"),
  route("collection/:slug", "routes/collection.$slug.tsx"),
  route("auth/signin", "routes/auth/signin.tsx"),
  route("auth/signup", "routes/auth/signup.tsx"),
  route("auth/signout", "routes/auth/signout.tsx"),
  route("card-lab", "routes/card-lab.tsx"),
] satisfies RouteConfig;
