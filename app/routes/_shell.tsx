import { Outlet } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { Nav } from "../components/layout/nav";

export async function loader({ context }: LoaderFunctionArgs) {
  return { user: context.user };
}

export default function Shell({ loaderData }: { loaderData: Awaited<ReturnType<typeof loader>> }) {
  const { user } = loaderData;
  return (
    <>
      {user && <Nav userName={user.name} isAnonymous={user.isAnonymous} />}
      <Outlet />
    </>
  );
}
