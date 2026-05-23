import { redirect } from "react-router";
import type { Route } from "./+types/signout";

export async function action({ request }: Route.ActionArgs) {
  const res = await fetch(
    new URL("/api/auth/sign-out", request.url).toString(),
    {
      method: "POST",
      headers: { cookie: request.headers.get("cookie") ?? "" },
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
