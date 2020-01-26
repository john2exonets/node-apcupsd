#
#  Startup.sh -- set environment vars and then run program
#

export UPSNAME=$(grep ^UPSNAME /etc/apcupsd/apcupsd.conf | cut -f2 -d' ')
export APCHOST=$(grep ^DEVICE /etc/apcupsd/apcupsd.conf | cut -f2 -d' ')

node ./app.js
