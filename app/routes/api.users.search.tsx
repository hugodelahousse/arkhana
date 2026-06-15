import { data } from "react-router";
import type { Route } from "./+types/api.users.search";
import { searchUsers } from "../lib/follows";

export async function loader({ request, context }: Route.LoaderArgs) {
  const viewer = context.user;
  if (!viewer || viewer.isAnonymous) {
    return data({ users: [] });
  }

  const q = new URL(request.url).searchParams.get("q") ?? "";
  const users = await searchUsers(viewer.id, q);
  return data({ users });
}
