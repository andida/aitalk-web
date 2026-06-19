// OpenNext Cloudflare config for the AITalk web deploy.
import { defineCloudflareConfig } from '@opennextjs/cloudflare';

const config = defineCloudflareConfig({
  // Alpha deploy intentionally uses OpenNext's dummy cache to avoid requiring
  // an R2 bucket before the first public preview.
});

config.buildCommand = 'npm run build:next';

export default config;
