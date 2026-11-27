#!/bin/zsh
root=${0:A:h}
if ! /usr/bin/python3 "$root/grok-bridge.py" "$@"; then
  printf '\n按回车关闭窗口。\n'
  read -r
  exit 1
fi
