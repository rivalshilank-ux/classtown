/**
 * Creates an admin account. Run manually by an operator holding the real
 * Supabase service role key -- there is no public admin signup route, no AI
 * tool ever calls this, and no web route exposes it. See
 * docs/adr/0003-admin-authentication.md.
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     pnpm --filter @classtown/web create-admin -- --email admin@example.com --name "관리자"
 *
 * Prints a one-time temporary password if --password is not supplied. The
 * admin should sign in and the account owner should rotate it immediately --
 * this script does not persist the password anywhere.
 */
import { createClient } from "@supabase/supabase-js";

function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token && token.startsWith("--")) {
      const key = token.slice(2);
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`Missing value for --${key}`);
      }
      args[key] = value;
      i += 1;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const email = args.email;
  const name = args.name;

  if (!email || !name) {
    console.error("Usage: pnpm create-admin -- --email <email> --name <name> [--password <password>]");
    process.exitCode = 1;
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment.");
    process.exitCode = 1;
    return;
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const generatedPassword = args.password ?? crypto.randomUUID();

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: generatedPassword,
    email_confirm: true,
    // handle_new_admin() (20260906000000_admin_accounts.sql) only creates an
    // admin_accounts row when raw_user_meta_data->>'role' is exactly 'admin'.
    user_metadata: { role: "admin", name },
  });

  if (error || !data.user) {
    console.error("Failed to create admin user:", error?.message ?? "unknown error");
    process.exitCode = 1;
    return;
  }

  console.log(`Created admin account for ${email} (auth.users id: ${data.user.id}).`);
  if (!args.password) {
    console.log(`Temporary password: ${generatedPassword}`);
    console.log("Have the admin sign in at /admin/login and rotate this password immediately.");
  }
}

void main();
