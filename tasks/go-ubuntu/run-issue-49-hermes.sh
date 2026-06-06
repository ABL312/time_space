#!/usr/bin/env bash
set -e
cd /srv/time_space/orchestrator
mkdir -p tasks/go-ubuntu/logs
nohup /usr/local/bin/hermes chat -q "$(cat tasks/go-ubuntu/issue-49-backend-dev.md)" --yolo --quiet > tasks/go-ubuntu/logs/issue-49-hermes.log 2>&1 < /dev/null &
echo PID:$!
sleep 2
ps -p $! -o pid=,cmd=
echo LOG:/srv/time_space/orchestrator/tasks/go-ubuntu/logs/issue-49-hermes.log
sed -n "1,40p" tasks/go-ubuntu/logs/issue-49-hermes.log || true
