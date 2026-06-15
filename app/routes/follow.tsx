import { data } from "react-router";
import type { Route } from "./+types/follow";
import { followUser, unfollowUser, resolveFollowTarget } from "../lib/follows";
import { sendPushToUser } from "../lib/push";

// Resource route (no UI). POST { intent: "follow" | "unfollow", targetUsername }.
// Social requires a real account, so anonymous users are rejected.
export async function action({ request, context }: Route.ActionArgs) {
  const viewer = context.user;
  if (!viewer || viewer.isAnonymous) {
    return data({ error: "Sign up to build your circle." }, { status: 401 });
  }

  const form = await request.formData();
  const intent = String(form.get("intent") ?? "follow");
  const targetUsername = String(form.get("targetUsername") ?? "");
  if (!targetUsername) {
    return data({ error: "Missing target." }, { status: 400 });
  }

  const target = await resolveFollowTarget(viewer.id, targetUsername);
  if (target.status === "not_found") {
    return data({ error: "User not found." }, { status: 404 });
  }
  if (target.status === "self") {
    return data({ error: "You cannot follow yourself." }, { status: 400 });
  }

  if (intent === "unfollow") {
    await unfollowUser(viewer.id, target.targetId);
    return data({ ok: true, following: false });
  }

  await followUser(viewer.id, target.targetId);

  // Notify the followed user (best-effort; never block the response).
  const handle = viewer.username ?? viewer.name;
  await sendPushToUser(target.targetId, {
    type: "new-follower",
    title: "Arkhana",
    body: `✨ @${handle} started following you`,
    url: viewer.username ? `/u/${viewer.username}` : "/",
    tag: "new-follower",
  });

  return data({ ok: true, following: true });
}
