import { redirect } from "react-router";

export async function loader() {
  return redirect("/");
}

export default function SignIn() {
  return null;
}
