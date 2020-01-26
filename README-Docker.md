ApsUPS Docker Container
=======================

Containerize the node-apcupsd program.

First, after you pull all these files, you will need to get a working apcupsd.conf file to run the container.  This allows you to run multiple copies of the container with different APCUPS' 

1. Buld the Container.
I have included my own build script, but use what works for you.

<pre>
# Bump version number & build
VERSION=$(cat VERSION | perl -pe 's/^((\d+\.)*)(\d+)(.*)$/$1.($3+1).$4/e' | tee VERSION)
docker build -t jdallen/apcups:$VERSION -t jdallen/apcups:latest .
</pre>

2. Run the Container.

<pre>
docker run -d --restart=always \
  --name=apcups1 \
  --volume /root/Docker/apcups1/apcupsd.conf:/etc/apcupsd/apcupsd.conf \
  jdallen/apcups:latest
</pre>

The 'volume' should point to your local directory that holds the apcupsd.conf file you are using.


