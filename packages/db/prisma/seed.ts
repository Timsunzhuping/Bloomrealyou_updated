/**
 * WP-00 placeholder seed script. Real seeding is added in later work packages.
 */
async function main(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('[db] seed placeholder — nothing to seed for WP-00.');
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
