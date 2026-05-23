declare module "react-router" {
  interface AppLoadContext {
    user: { id: string; name: string; email: string } | null;
  }
}
