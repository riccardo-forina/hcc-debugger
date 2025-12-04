# hcc-debugger 

A debugging tool for Red Hat Hybrid Cloud Console UI modules. Provides feature flag management, entitlements inspection, roles/permissions viewer, and active module information.

## Initial etc/hosts setup

In order to access the https://[env].foo.redhat.com in your browser, you have to add entries to your `/etc/hosts` file. This is a **one-time** setup that has to be done only once (unless you modify hosts) on each devel machine.

Best way is to edit manually `/etc/hosts` on your localhost line:

```
127.0.0.1 <your-fqdn> localhost prod.foo.redhat.com stage.foo.redhat.com
```

Alternatively you can do this by running following command:
```bash
npm run patch:hosts
```

If this command throws an error run it as a `sudo`:
```bash
sudo npm run patch:hosts
```

## Getting started

1. ```npm install```

2. ```npm run start```

3. Open browser in URL listed in the terminal output

### Testing

- `npm run verify` - Runs build, lint (eslint), and test (Jest)
- `npm run test` - Run Jest unit tests
- `npm run storybook` - Open Storybook for component development
- `npm run test-storybook` - Run Storybook interaction tests
