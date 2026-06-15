import { useRef, useState } from "react";
import { Link, redirect, useFetcher } from "react-router";
import type { Route } from "./+types/circle.people";
import type { loader as searchLoader } from "./api.users.search";
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

function UserSearch() {
  const fetcher = useFetcher<typeof searchLoader>();
  const [query, setQuery] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(e: { target: { value: string } }) {
    const val = e.target.value;
    setQuery(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!val.trim()) return;
    timerRef.current = setTimeout(() => {
      fetcher.load(`/api/users/search?q=${encodeURIComponent(val)}`);
    }, 300);
  }

  const results = fetcher.data?.users ?? [];
  const showResults = query.trim().length > 0;

  return (
    <section className="space-y-4">
      <h2 className="type-label">Find readers</h2>
      <input
        type="search"
        placeholder="Search by username…"
        value={query}
        onChange={handleChange}
        className="w-full bg-muted border border-border rounded px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      />
      {showResults && (
        <ul>
          {fetcher.state === "loading" && results.length === 0 ? (
            <li className="type-ghost py-3">Searching…</li>
          ) : results.length === 0 ? (
            <li className="type-ghost py-3">No readers found for "{query}"</li>
          ) : (
            results.map((p) => (
              <PersonRow key={p.id} person={p} following={p.isFollowing} />
            ))
          )}
        </ul>
      )}
    </section>
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

          <UserSearch />

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
