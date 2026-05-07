#!/bin/bash
set -e
mkdir -p /tmp/.X11-unix
chmod 1777 /tmp/.X11-unix
Xvfb :99 -screen 0 1920x1080x24 -ac +extension GLX +render -noreset &
sleep 2
export DISPLAY=:99
exec python "${1:-member.py}"
