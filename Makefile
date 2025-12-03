.PHONY: lint lint-py lint-js format format-py format-js typecheck typecheck-py typecheck-js all

lint: lint-py lint-js

format: format-py format-js

typecheck: typecheck-py typecheck-js

all: lint typecheck

lint-py:
	uvx ruff check .

format-py:
	uvx black .

typecheck-py:
	uvx mypy src

lint-js:
	npm run lint --if-present

format-js:
	npm run format --if-present

typecheck-js:
	npm run typecheck --if-present
