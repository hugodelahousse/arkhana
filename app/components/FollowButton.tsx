import { useFetcher } from "react-router";
import { buttonClass } from "./Button";

// Inline follow/unfollow toggle. Posts to the /follow resource route via a
// fetcher so it never navigates, and reflects the in-flight intent optimistically.
// Uses the shared buttonClass() so it lines up with other design-system buttons
// (e.g. ShareButton). Follow = "fill" (primary action); Following = "outline".
export function FollowButton({
  username,
  following,
  size = "md",
  followLabel = "Follow",
  followingLabel = "Following",
}: {
  username: string;
  following: boolean;
  size?: "sm" | "md";
  followLabel?: string;
  followingLabel?: string;
}) {
  const fetcher = useFetcher();
  const optimisticFollowing = fetcher.formData
    ? fetcher.formData.get("intent") === "follow"
    : following;

  return (
    <fetcher.Form method="post" action="/follow">
      <input type="hidden" name="targetUsername" value={username} />
      <input type="hidden" name="intent" value={optimisticFollowing ? "unfollow" : "follow"} />
      <button
        type="submit"
        aria-pressed={optimisticFollowing}
        className={buttonClass(
          size,
          optimisticFollowing ? "outline" : "fill",
          "inline-flex items-center gap-2"
        )}
      >
        {optimisticFollowing ? followingLabel : followLabel}
      </button>
    </fetcher.Form>
  );
}
