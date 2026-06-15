import "react-router";

declare module "react-router" {
  interface AppLoadContext {
    user: { id: string; name: string; email: string; username: string | null; isAnonymous: boolean; timezone: string | null } | null;
  }
}
