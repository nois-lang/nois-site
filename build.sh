#!/usr/bin/env bash

git clone https://github.com/nois-lang/noisc ../noisc
pushd .
cd ../noisc
npm install
npm run publish
ls dist

popd
rustup default stable
cargo install mdbook
npm install
npm run build
ls dist
