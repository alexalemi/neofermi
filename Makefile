# NeoFermi Makefile
# Build the library, CLI binary, and render example outputs

.PHONY: all build parser lib cli examples clean test help

# Default target
all: build examples

# Build everything (parser, library, CLI)
build: parser lib cli

# Build just the PEG parser
parser:
	@echo "Building parser..."
	pnpm parser:build

# Build the TypeScript library
lib: parser
	@echo "Building library..."
	pnpm build

# Build the CLI binary
cli: parser
	@echo "Building CLI..."
	pnpm build:cli
	@chmod +x bin/neoferminb.cjs

# Example markdown files
EXAMPLE_MDS := $(wildcard examples/*.md)
EXAMPLE_HTMLS := $(EXAMPLE_MDS:.md=.html)

# Render all examples to static HTML
examples: cli $(EXAMPLE_HTMLS)
	@echo "All examples rendered."

# Pattern rule: render .md to .html
examples/%.html: examples/%.md bin/neoferminb.cjs
	@echo "Rendering $<..."
	@node bin/neoferminb.cjs "$<" --output "$@"

# Run tests
test:
	pnpm test -- --run

# Run tests in watch mode
test-watch:
	pnpm test

# Type checking
typecheck:
	pnpm typecheck

# Lint the code
lint:
	pnpm lint

# Format the code
format:
	pnpm format

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
	pnpm install

# Development server
dev:
	pnpm dev

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
	@echo "  help       - Show this help"
