# The two things you can run locally, and the install they both need first.
#
# Every recipe here is a thin wrapper over a script the app already declares —
# `apps/gallery` and `apps/site` stay the single source of truth for how each one
# starts, so a flag added there is picked up here with no edit. CI does not read
# this file; it calls turbo directly.
#
# Targets:
#   make ladle     the story gallery      http://localhost:6006
#   make site      designpineapple.com    http://localhost:6007
#   make install   dependencies only, without starting anything
#
# Ports are allocated per app and pinned in each app's config, not passed here.

.DEFAULT_GOAL := help

# The install is the step that bites. node_modules goes stale the moment any
# workspace manifest gains a dependency, and nothing says so at install time --
# it surfaces much later as an unresolved import from whichever app you happened
# to start next, naming a package you never touched. So both run targets depend
# on this stamp rather than trusting node_modules to be current.
#
# The stamp tracks package-lock.json because npm rewrites the lock on every
# manifest change, which makes it the one file whose mtime moves for a
# dependency edit anywhere in the monorepo. node_modules' own mtime does not:
# npm mutates package directories underneath it and leaves the parent alone.
# Result: the install re-runs exactly when a dependency changed, and is a
# no-op -- no npm process at all -- every other time you type `make site`.
NODE_MODULES_STAMP := node_modules/.install-stamp

$(NODE_MODULES_STAMP): package-lock.json
	npm install --no-audit --no-fund
	@mkdir -p $(@D)
	@touch $@

.PHONY: install
install: $(NODE_MODULES_STAMP)

# Resolves every @pineappleui/* import to that package's src/, so a component
# edit shows up on reload with no build in between.
.PHONY: ladle
ladle: $(NODE_MODULES_STAMP)
	npm run ladle -w @pineappleui/gallery

# The site's own `dev` script regenerates the props tables (turbo run props)
# before starting vite -- turbo caches that, so it is only slow the first time.
.PHONY: site
site: $(NODE_MODULES_STAMP)
	npm run dev -w @pineappleui/site

.PHONY: help
help:
	@echo 'make ladle     story gallery         http://localhost:6006'
	@echo 'make site      designpineapple.com   http://localhost:6007'
	@echo 'make install   dependencies only'
	@echo
	@echo 'Both run targets install first when package-lock.json has moved.'
	@echo 'Checks stay on npm: `npm run verify`, `npm test`, `npm run build`.'
