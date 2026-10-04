import "dotenv/config";
import { createClient } from "./shared";
import { ensureNamedAccounts } from "./accounts";

/** `npm run admin:accounts` — create/update the named team accounts from .env without reseeding. */
async function main() {
  const db = createClient();
  try {
    console.table(await ensureNamedAccounts(db));
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
