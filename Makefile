update:
	git pull --recurse-submodules

release:
	shell_script ./scripts/release.sh

build:
	docker build . -t satellite-earth/public-node
