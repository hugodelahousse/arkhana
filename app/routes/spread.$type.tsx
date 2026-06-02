import { redirect, data } from "react-router";
import type { Route } from "./+types/spread.$type";
import { getSpreadType } from "../lib/spreads";
import { todayForUser } from "../lib/utils";

export async function loader({ context, params }: Route.LoaderArgs) {
  if (!context.user) return redirect("/");
  const spreadDef = getSpreadType(params.type);
  if (!spreadDef) throw data("Spread not found", { status: 404 });
  return redirect(`/spread/${params.type}/${todayForUser(context.user.timezone)}`);
}

export function meta() {
  return [{ title: "Arkhana" }];
}

export default function SpreadRedirect() {
  return null;
}
