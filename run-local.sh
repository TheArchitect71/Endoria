#!/bin/sh
set -eu
cd "$(dirname "$0")"
# Follow README local MongoDB setup in another foreground terminal first.
exec npm start
