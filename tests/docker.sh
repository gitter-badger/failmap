#!/bin/sh

set -xe

# run simple smoketests to verify docker image build is sane

host=${1:-localhost}

if test -f /bin/busybox;then
  timeout="timeout -t ${TIMEOUT:-15}"
else
  timeout="timeout ${TIMEOUT:-15}"
fi

handle_exception(){
  docker stop failmap-$$ &
}

# start docker container
docker run --rm --name failmap-$$ -e "ALLOWED_HOSTS=$host" -p 8000 -d \
  "${IMAGE:-registry.gitlab.com/failmap/failmap:latest}" \
  production --migrate --loaddata development
docker logs failmap-$$ -f 2>&1 | awk '$0="docker: "$0' &
port="$(docker port failmap-$$ 8000/tcp | cut -d: -f2)"
trap "handle_exception" EXIT

# wait for server to be ready
sleep 3
$timeout /bin/sh -c "while ! curl -sSIk http://$host:$port | grep 200\ OK;do sleep 1;done"

# index page
curl -s "http://$host:$port" |grep MSPAINT.EXE
# static files
curl -sI "http://$host:$port/static/images/red-dot.png" |grep 200\ OK
# compressed static files
curl -sI "http://$host:$port/static/$(curl -s "http://$host:$port/static/CACHE/manifest.json"|sed -n 's,.*\(CACHE/js/.*js\).*,\1,p')"|grep 200\ OK
# admin login
curl -siv --cookie-jar cookie-$$ --cookie cookie-$$ "http://$host:$port/admin/login/"|grep 200\ OK
curl -siv --cookie-jar cookie-$$ --cookie cookie-$$ --data "csrfmiddlewaretoken=$(grep csrftoken cookie-$$ | cut -f 7)&username=admin&password=faalkaart" "http://$host:$port/admin/login/"|grep 302\ Found

# cleanup
docker stop failmap-$$ || true
trap "" EXIT

echo "All good!"
