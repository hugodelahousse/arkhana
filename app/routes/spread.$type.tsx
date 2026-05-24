import { redirect, data } from "react-router";
import { DateTime } from "luxon";
import type { Route } from "./+types/spread.$type";
import { getSpreadType } from "../lib/spreads";
import { todayUTC } from "../lib/utils";

export async function loader({ context, params }: Route.LoaderArgs) {
  if (!context.user) return redirect("/");
  const spreadDef = getSpreadType(params.type);
  if (!spreadDef) throw data("Spread not found", { status: 404 });
  // Redirect to today's date-specific view; the ceremony lives on the home page
  return redirect(`/spread/${params.type}/${todayUTC()}`);
}

export function meta() {
  return [{ title: "Arkhana" }];
}

export default function SpreadRedirect() {
  return null;
}
