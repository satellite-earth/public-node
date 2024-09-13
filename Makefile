update:
	git pull --recurse-submodules

build:
	docker build . -t satellite-earth/public-node
