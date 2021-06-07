# xBrowserSync API implementation using Cloudflare worker and KV

This is a simple implementation of the [xBrowserSync API](https://github.com/xbrowsersync/api) using Cloudflare workder.
It uses Cloudflare KV as storage.

## Deployment

- Create a Cloudflare worker project
- Create a KV namespace, and add KV binding in the worker project, name it as `XBSKV`
- Paste the content of [index.js](./index.js) into worker, modify the settings and then save and deploy
- Profit

## Usage

Point your xBrowserSync plugin/app to your worker URL
