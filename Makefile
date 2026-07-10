# NeoFermi Makefile
# Build the library, CLI binary, and render example outputs

.PHONY: all build parser lib cli embed examples clean test help package publish

# Default target
all: build examples

# Build everything (parser, library, CLI)
build: parser lib cli

# Build just the PEG parser
parser:
	@echo "Building parser..."
	bun parser:build

# Build the TypeScript library
lib: parser
	@echo "Building library..."
	bun run build

# Build the embeddable script bundle
embed: parser
	@echo "Building embed bundle..."
	bun build:embed

# Build the CLI binary
cli: parser
	@echo "Building CLI..."
	bun build:cli
	@chmod +x bin/neoferminb.cjs

# Example markdown files
EXAMPLE_MDS := $(wildcard examples/*.md)
EXAMPLE_HTMLS := $(EXAMPLE_MDS:.md=.html)

# Render all examples to static HTML (plus the gallery index)
examples: cli $(EXAMPLE_HTMLS)
	@node scripts/build-examples-index.js
	@echo "All examples rendered."

# Pattern rule: render .md to .html
examples/%.html: examples/%.md bin/neoferminb.cjs
	@echo "Rendering $<..."
	@node bin/neoferminb.cjs "$<" --output "$@"

# Run tests
test:
	bun run test -- --run

# Run tests in watch mode
test-watch:
	bun run test

# Type checking
typecheck:
	bun typecheck

# Lint the code
lint:
	bun lint

# Format the code
format:
	bun format

# Clean build artifacts
clean:
	rm -rf dist/
	rm -f bin/neoferminb.cjs bin/neoferminb.cjs.map
	rm -f src/parser/generated.js
	rm -f examples/*.html

# Deep clean (including node_modules)
distclean: clean
	rm -rf node_modules/

# Install dependencies
install:
	bun install

# Development server
dev:
	bun dev

# Build npm package (library + types + CLI). dist/ is rebuilt from scratch so
# the tarball ships only the library build, not the Vite website bundle, and
# the peggy-generated parser (plain .js, not emitted by tsc) is copied in.
package: parser cli
	@echo "Building library + declarations..."
	rm -rf dist
	bun build:types
	cp src/parser/generated.js dist/parser/
	@echo "Creating package tarball..."
	bun pm pack
	@echo "Package created: neofermi-$$(node -p "require('./package.json').version").tgz"

# Publish to npm (runs tests first)
publish: test package
	@echo "Publishing to npm..."
	bun publish --access public

# Help
help:
	@echo "NeoFermi Build System"
	@echo ""
	@echo "Targets:"
	@echo "  all        - Build everything and render examples (default)"
	@echo "  build      - Build parser, library, and CLI"
	@echo "  parser     - Build PEG.js parser only"
	@echo "  lib        - Build TypeScript library"
	@echo "  cli        - Build CLI binary"
	@echo "  embed      - Build embeddable script bundle (neofermi-embed.js)"
	@echo "  examples   - Render example markdown files to HTML"
	@echo "  test       - Run tests"
	@echo "  test-watch - Run tests in watch mode"
	@echo "  typecheck  - Run TypeScript type checking"
	@echo "  lint       - Run ESLint"
	@echo "  format     - Format code with Prettier"
	@echo "  clean      - Remove build artifacts"
	@echo "  distclean  - Remove all generated files including node_modules"
	@echo "  install    - Install dependencies"
	@echo "  dev        - Start development server"
	@echo "  package    - Build npm package tarball"
	@echo "  publish    - Publish to npm (runs tests first)"
	@echo "  help       - Show this help"
