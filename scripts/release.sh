#!/bin/bash

git pull
cd packages
git pull origin master
cd ..

version=$(jq -r .version packages/apps/public-node/package.json)
tag="v$version"

if git rev-parse "$tag" >/dev/null 2>&1; then
	echo "Version tag already '$tag' exists"
else
	echo "Creating '$tag' version tag"

	git add .
	git commit -m $tag
	git tag $tag

	git push --tags
fi
