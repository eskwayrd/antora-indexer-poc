.PHONY: all dependencies help html serve
.SILENT: help

# Color codes
e       := "\\x1b"
bold    := "$(e)[1m"
cyan    := "$(e)[36m"
reset   := "$(e)[0m"
heading := "$(bold)$(cyan)"

all: dependencies html serve

help:
	echo "$(heading)Antora Indexer POC$(reset)"
	echo "$(bold)make help$(reset)         - Prints this help"
	echo "$(bold)make$(reset)              - Installs, builds HTML, serves"
	echo "$(bold)make dependencies$(reset) - Installs NPM dependencies"
	echo "$(bold)make html$(reset)         - Runs Antora"
	echo "$(bold)make serve$(reset)        - Builds the HTML then serves it"

# Install Antora (and other dependencies) if it does not exist
node_modules/.bin/antora:
	npm i

# Install serve (and other dependencies) if it does not exist
node_modules/.bin/serve:
	npm i

dependencies: node_modules/.bin/antora node_modules/.bin/serve

html: dependencies
	node_modules/.bin/antora --generator=./generator/generator.js antora-playbook.yml

serve: html
	node_modules/.bin/serve public/
