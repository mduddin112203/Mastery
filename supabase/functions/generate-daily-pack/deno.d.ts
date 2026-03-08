
/* Deno and Supabase types for Edge Functions when Deno extension is not active. */
declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
  env: { get(key: string): string | undefined };
};

declare module "@supabase/supabase-js" {
  export function createClient(
    url: string,
    key: string,
    options?: { auth?: { persistSession?: boolean; autoRefreshToken?: boolean } }
  ): any;
}
