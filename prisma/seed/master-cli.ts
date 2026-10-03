import "dotenv/config";
import { createClient } from "./shared";
import { ensureMasterAdmin } from "./master";

/** `npm run admin:master` — create/update the Master Admin from .env without reseeding. */
async function main() {
  const db = createClient();
  try {
    console.table(await ensureMasterAdmin(db));
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
