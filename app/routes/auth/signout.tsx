import { redirect } from "react-router";
import type { Route } from "./+types/signout";
import { config } from "../../../config/index.js";

export async function action({ request }: Route.ActionArgs) {
  const origin = config.appOrigin;
  const res = await fetch(
    new URL("/api/auth/sign-out", config.betterAuthUrl).toString(),
    {
      method: "POST",
      headers: {
        cookie: request.headers.get("cookie") ?? "",
        "content-type": "application/json",
        origin,
      },
      body: "{}",
    }
  );
  const setCookie = res.headers.get("set-cookie");
  return redirect("/", {
    headers: setCookie ? { "set-cookie": setCookie } : {},
  });
}

export async function loader() {
  return redirect("/");
}
