/*

   App to poll an APC UPS (via apcupsd) and publish interesting values to MQTT.
   Published under MIT license by Ron Klinkien <ron@cyberjunky.nl>
   Copyright (C) 2014 The Netherlands

   https://github.com/cyberjunky/node-apcupsd

   John D. Allen
   March 2019
   -- Added specific payloads depending on the key field.

*/

'use strict';
var topic = 'ups'; // topic basename
var devicename = process.env.UPSNAME;
var daemon = process.env.APCHOST;
var apccmd = "apcaccess -h " + daemon;
var pollint = 10000; // poll every 10 seconds, only changed values will be published
var alerttime = 0;

var exec = require('child_process').exec;
var mqtt = require('mqtt');
//var mclient = mqtt.createClient(mqttbroker.port, mqttbroker.address);
var copts = {
  keepalive: 20000
};

var mclient = mqtt.connect("http://10.1.1.28", copts);
var curvalues = {}; // holds current values
var wanted = [ 'model', 'status', 'linev', 'linefreq', 'timeleft', 'loadpct', 'battv', 'bcharge'];

function executeCmd(cmd, callback) {

    exec(cmd, function (err, stdout, stderror) {
      // console.log('stdout: %s', output);
      if (err) {
        callback(err);
      }
      else if (stderror) {
        callback(stderror);
      }
      else {
        if (stdout) {
          callback(null,stdout);
        }
        else {
          callback(null, null);
        }
      }
    });
}

function poll() {
    executeCmd(apccmd, function(err, response) {
      if (err) {
        console.error(err);
      }
      else {
        // console.log(response);
        var lines = response.trim().split("\n");
      //console.log(">" + lines.length);
        // loop over every line
        lines.forEach((line) => {
          // assign values
          var stats = line.split(' : ');
          var label = stats[0].toLowerCase();
          var value = stats[1];

          // remove surrounding spaces
          label = label.replace(/(^\s+|\s+$)/g, '');
          // if found as wanted value, store it
          if (wanted.indexOf(label) > -1) {
            value = value.replace(/(^\s+|\s+$)/g, '');
            // check if value is known, if not store and publish value
            if (curvalues[label] != value) {
              curvalues[label] = value;
              // console.log(value+" changed!");
              // publish value
            //console.log('.');
              setPayload(label, value).then((payload) => {
                mclient.publish(topic+'/'+label+'/'+devicename, payload);
                if (label == "status" && value !== "ONLINE" && value !== "ONLINE REPLACEBATT") {
                  if (alerttime + 300000 < Date.now()) {          // only every five minutes
                    alerttime = Date.now();
                    mclient.publish("alert/" + devicename, "UPS is NOT Online: " + value);
                  }
                }
              });
              if (err) throw err;
            }
          }
        });
      }
      // console.log(curvalues);
      setTimeout(poll, pollint);
    });
}

// Create the Payload string
function setPayload(key, value) {
  return new Promise((resolve, reject) => {
    var vals = value.split(/ /);
    switch (key) {
      case 'linev':
        resolve('{"volts": ' + vals[0] +'}');
        break;
      case 'loadpct':
        resolve('{"percent": ' + vals[0] + '}');
        break;
      case 'timeleft':
        resolve('{"minutes": ' + vals[0] + '}');
        break;
      case 'battv':
        resolve('{"volts": ' + vals[0] + '}');
        break;
      case 'model':
        resolve('{"model": "' + value + '"}');
        break;
      case 'status':
        resolve('{"status": "' + value + '"}');
        break;
      case 'bcharge':
        resolve('{"percent": ' + vals[0] + '}');
        break;
      default:
        reject("Unknown Value!");
    }
  });
}

function setPayloadB(key, value) {
  return new Promise((resolve, reject) => {
    setPayload(key, value).then((payload) => {
      resolve([key, payload]);
    });
  });
}

// periodic publishing of stored values
function statsOut() {
  //console.log(">StatsOut: " + Object.keys(curvalues).length);
  for (var k in curvalues) {
    if (curvalues.hasOwnProperty(k)) {
      //console.log('.');
      setPayloadB(k, curvalues[k]).then((t) => {
        //console.log(t[0] + ":" + t[1]);
        mclient.publish(topic+'/'+t[0]+'/'+devicename, t[1]);
      });
    }
  }
  setTimeout(statsOut, 600000);       // Every 10 minutes
}

// Check to see of the status says that we need to replace the Batteries!
function chkBattery() {
  if (curvalues['status'] == "ONLINE REPLACEBATT") {
    mclient.publish("alert/" + devicename, "UPS Battery needs to be replaced!");
  }
  setTimeout(chkBattery, 86400000);     // 24 hours; recheck tomorrow
}

// start plugin
function main() {

    console.log('Started APCUPSD monitor');
    poll();
    setTimeout(statsOut, 300000);     // first go in 5 minues
    setTimeout(chkBattery, 600000);   // first check in 10 minutes
}
main();
