update:
	git pull --recurse-submodules

release:
	./scripts/release.sh

build:
	docker build . -t satellite-earth/public-node
