import { Link, redirect } from "react-router";
import type { Route } from "./+types/circle.people";
import { DirectionalTransition } from "../components/DirectionalTransition";
import { FollowButton } from "../components/FollowButton";
import { getFollowers, getFollowing, type FollowProfile } from "../lib/follows";

export async function loader({ context }: Route.LoaderArgs) {
  const viewer = context.user;
  if (!viewer) return redirect("/");
  if (viewer.isAnonymous) return redirect("/circle");

  const [followers, following] = await Promise.all([
    getFollowers(viewer.id),
    getFollowing(viewer.id),
  ]);
  return { followers, following };
}

export function meta() {
  return [
    { title: "Your Circle — Arkhana" },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

function PersonRow({
  person,
  following,
  followLabel,
}: {
  person: FollowProfile;
  following: boolean;
  followLabel?: string;
}) {
  const handle = person.displayUsername ?? person.username ?? "reader";
  return (
    <li className="flex items-center justify-between py-3 border-b border-muted">
      {person.username ? (
        <Link to={`/u/${person.username}`} className="type-body-serif hover:text-foreground transition-colors">
          @{handle}
        </Link>
      ) : (
        <span className="type-body-serif">@{handle}</span>
      )}
      {person.username && (
        <FollowButton
          username={person.username}
          following={following}
          size="sm"
          followLabel={followLabel}
        />
      )}
    </li>
  );
}

export default function CirclePeople({ loaderData }: Route.ComponentProps) {
  const { followers, following } = loaderData;

  return (
    <DirectionalTransition>
      <div className="min-h-screen">
        <main className="max-w-2xl mx-auto px-6 py-12 space-y-12">
          <div className="text-center space-y-2">
            <h1 className="type-page-title text-2xl">Your Circle</h1>
            <Link to="/circle" className="type-label hover:text-foreground transition-colors">
              ← Back to today's board
            </Link>
          </div>

          <section className="space-y-4">
            <h2 className="type-label">Following · {following.length}</h2>
            {following.length === 0 ? (
              <p className="type-ghost">You're not following anyone yet. Open a friend's profile to follow them.</p>
            ) : (
              <ul>
                {following.map((p) => (
                  <PersonRow key={p.id} person={p} following={true} />
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-4">
            <h2 className="type-label">Followers · {followers.length}</h2>
            {followers.length === 0 ? (
              <p className="type-ghost">No followers yet. Share your profile link to grow your circle.</p>
            ) : (
              <ul>
                {followers.map((p) => (
                  <PersonRow
                    key={p.id}
                    person={p}
                    following={p.isFollowingBack}
                    followLabel="Follow back"
                  />
                ))}
              </ul>
            )}
          </section>
        </main>
      </div>
    </DirectionalTransition>
  );
}
