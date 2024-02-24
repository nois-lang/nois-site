#!/usr/bin/env bash

git clone https://github.com/nois-lang/nois ../nois
pushd .
cd ../nois
npm install
npm run publish
ls dist

popd
rustup default stable
cargo install mdbook
npm install
npm run build
ls dist
