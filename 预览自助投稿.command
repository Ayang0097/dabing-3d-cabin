#!/bin/zsh
cd -- "$(dirname -- "$0")" || exit
exec /usr/bin/env python3 community_server.py --open
