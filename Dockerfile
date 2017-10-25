# use full image for build (compile) dependencies
FROM python:3 as build

# install app and dependencies in a artifact-able directory
RUN pip install virtualenv
RUN virtualenv /pyenv

# install requirements seperately as they change less often then source, improved caching
COPY requirements*.txt /
RUN /pyenv/bin/pip install -r requirements.txt
RUN /pyenv/bin/pip install -r requirements.deploy.txt

# install the app
COPY . /source/
RUN /pyenv/bin/pip install /source/

# switch to lightweight base image for distribution
FROM python:3-slim

# hack for slim image to fix broken install of postgres
RUN /bin/bash -c 'mkdir -p /usr/share/man/man{1..8}'

# install dependent libraries (remove cache to prevent inclusion in layer)
RUN apt-get update && \
  apt-get install -yqq libxml2 libmysqlclient18 mysql-client postgresql postgresql-contrib mime-support && \
  rm -rf /var/lib/apt/lists/*

# install build application
COPY --from=build /pyenv /pyenv

# expose relevant executable(s)
RUN ln -s /pyenv/bin/failmap-admin /usr/local/bin/
RUN ln -s /pyenv/bin/uwsgi /usr/local/bin/
RUN ln -s /pyenv/bin/celery /usr/local/bin/

WORKDIR /

# configuration for django-uwsgi to work correct in Docker environment
ENV UWSGI_GID root
ENV UWSGI_UID root
ENV UWSGI_MODULE failmap_admin.wsgi
# serve static files (to caching proxy) from collected/generated static files
ENV UWSGI_STATIC_MAP /static=/srv/failmap-admin/static
# set proxy and browser caching for static files to 1 month
ENV UWSGI_STATIC_EXPIRES /* 2678400

# collect all static files form all django applications into static files directory
RUN /pyenv/bin/failmap-admin collectstatic

# Compress JS/CSS before serving, using django-compressor, run after collectstatic
# COMPRESS=1 is a hack to disable django_uwsgi app as it currently conflicts with compressor
# https://github.com/django-compressor/django-compressor/issues/881
RUN env COMPRESS=1 /pyenv/bin/failmap-admin compress

EXPOSE 8000

ENTRYPOINT [ "/usr/local/bin/failmap-admin" ]

CMD [ "help" ]
