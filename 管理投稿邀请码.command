#!/bin/zsh
cd -- "${0:A:h}" || exit 1

while true; do
  printf '\n小屋投稿邀请码\n  1  生成邀请码\n  2  查看已发邀请\n  3  撤销邀请码\n  0  退出\n'
  printf '请选择：'
  IFS= read -r choice || break
  case "$choice" in
    1)
      printf '发给谁？可填昵称，直接回车可跳过：'
      IFS= read -r label || break
      # The equals form also accepts names beginning with a hyphen.
      /usr/bin/env python3 -B community_server.py "--issue-invite=$label" &&
        printf '请单独把这枚邀请码发给对方。\n'
      ;;
    2) /usr/bin/env python3 -B community_server.py --list-invites ;;
    3)
      /usr/bin/env python3 -B community_server.py --list-invites || continue
      printf '输入要撤销的邀请编号（回车取消）：'
      IFS= read -r number || break
      [[ -z "$number" ]] || /usr/bin/env python3 -B community_server.py "--revoke-invite=$number"
      ;;
    0|'') break ;;
    *) printf '请输入 0、1、2 或 3。\n' ;;
  esac
done
