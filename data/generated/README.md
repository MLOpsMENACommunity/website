# Generated data

Written by `npm run refresh`, committed to git on purpose.

Committing rather than caching means a fresh clone with no network still
builds, a fork works with no configuration, and `git log -p data/generated/`
is a free audit trail of what changed and when.

Nothing here should be hand-edited — the next refresh overwrites it. Fetchers
never write an empty payload over a non-empty one and never fail the build, so
a network outage leaves the last good copy in place.
