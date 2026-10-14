import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// No ISR / revalidation in this app, so the default (no incremental cache) is enough.
export default defineCloudflareConfig({});
