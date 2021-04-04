const _data = require('./data');
const http = require('http');
const https = require('https');
const helpers = require('./helpers');
const url = require('url');
const _logs = require('./logs');
const util = require('util');
const debug = util.debuglog('workers');

const workers = {};

workers.gatherAllChecks = () => {
    _data.list('checks', (error, checks) => {
        if (!error && checks && checks.length > 0) {
            checks.forEach(check => {
                _data.read('checks', check, (error, originalCheckData) => {
                    if (!error && originalCheckData) {
                        workers.validateCheckData(originalCheckData);
                    } else {
                        debug('Error reading one of the checks data');
                        debug(error);
                    }
                });
            });
        } else {
            debug('Error: Could not find any checks to process');
            if (error) {
                debug(error);
            }
        }
    });
};

workers.validateCheckData = (originalCheckData) => {
    originalCheckData = typeof(originalCheckData) == 'object' && originalCheckData !== null ? originalCheckData : {};
    originalCheckData.id = typeof(originalCheckData.id) == 'string' && originalCheckData.id.trim().length == 20 ? originalCheckData.id.trim() : false;
    originalCheckData.userPhone = typeof(originalCheckData.userPhone) == 'string' && originalCheckData.userPhone.trim().length == 7 ? originalCheckData.userPhone.trim() : false;
    originalCheckData.protocol = typeof(originalCheckData.protocol) == 'string' && ['http', 'https'].indexOf(originalCheckData.protocol) > -1 ? originalCheckData.protocol : false;
    originalCheckData.url = typeof(originalCheckData.url) == 'string' && originalCheckData.url.trim().length > 0 ? originalCheckData.url.trim() : false;
    originalCheckData.method = typeof(originalCheckData.method) == 'string' && ['GET', 'PUSH', 'PUT', 'DELETE'].indexOf(originalCheckData.method) > -1 ? originalCheckData.method : false;
    originalCheckData.successCodes = typeof(originalCheckData.successCodes) == 'object' && originalCheckData.successCodes instanceof Array && originalCheckData.successCodes.length > 0 ? originalCheckData.successCodes : false;
    originalCheckData.timeoutSeconds = typeof(originalCheckData.timeOutSeconds) == 'number' && originalCheckData.timeOutSeconds % 1 == 0 && originalCheckData.timeOutSeconds >= 1 && originalCheckData.timeOutSeconds <= 5 ? originalCheckData.timeOutSeconds : false;

    originalCheckData.state = typeof(originalCheckData.state) == 'string' && ['up', 'down'].indexOf(originalCheckData.state) > -1 ? originalCheckData.state : 'down';
    originalCheckData.lastChecked = typeof(originalCheckData.lastChecked) == 'number' && originalCheckData.lastChecked > 0 ? originalCheckData.lastChecked : false;

    if (originalCheckData.id && 
        originalCheckData.userPhone &&
        originalCheckData.protocol && 
        originalCheckData.url && 
        originalCheckData.method &&
        originalCheckData.successCodes &&
        originalCheckData.timeoutSeconds) {

        workers.performCheck(originalCheckData);
    } else {
        debug('Error: One of the checks is not properly formatted. Skipping it');
    }
};

workers.performCheck = (originalCheckData) => {
    const checkOutcome = {
        'error': false,
        'responseCode': false
    };

    let outcomeSent = false;

    const parsedUrl = url.parse(originalCheckData.protocol + '://' + originalCheckData.url, true);
    const hostName = parsedUrl.hostname;
    const path = parsedUrl.path;

    const requestDetails = {
        'protocol': originalCheckData.protocol + ':',
        'host': hostName,
        'method': originalCheckData.method.toUpperCase(),
        path,
        'timeout': originalCheckData.timeoutSeconds * 1000,
    };

    const _moduleToUse = originalCheckData.protocol === 'http' ? http : https;
    const req = _moduleToUse.request(requestDetails, (res) => {
        const status = res.statusCode;

        checkOutcome.responseCode = status;

        if (!outcomeSent) {
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    });

    req.on('error', (error) => {
        checkOutcome.error = {
            'error': true,
            'value': error
        };  
        if (!outcomeSent) { 
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    });

    req.on('timeout', (error) => {
        checkOutcome.error = {
            'error': true,
            'value': 'timeout'
        };  
        if (!outcomeSent) { 
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    });

    req.end();
};

workers.processCheckOutcome = (originalCheckData, checkOutcome) => {
    const state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1 ? 'up': 'down';

    const alertWarranted = originalCheckData.lastChecked && originalCheckData.state !== state ? true : false;

    const timeOfCheck = Date.now();
    const newCheckData = originalCheckData;
    newCheckData.state = state;
    newCheckData.lastChecked = timeOfCheck;

    workers.log(originalCheckData, newCheckData, state, alertWarranted, timeOfCheck);

    _data.update('checks', newCheckData.id, newCheckData, (error) => {
        if (!error) {
            if (alertWarranted) {
                workers.alertUserToStatusChange(newCheckData);
            } else {
                debug('Checkoutcome has not changed, alert not needed');
            }
        } else {
            debug('Error trying to save updates to one of the checks: ' + error);
        }
    })
};

workers.newCheckData = (newCheckData) => {
    const msg = 'Alert: Your check for ' + newCheckData.method.toUpperCase() + ' ' + newCheckData.protocol  + '://' + newCheckData.url + 
        ' is currently ' + newCheckData.state;

    helpers.sendTwilioSms(newCheckData.userPhone, msg, (error) => {
        if (!error) {
            debug('Success: User was alerted to a status change in the check via sms');
            debug(msg);
        } else {
            debug('Could not send sms alert to user who had a state change in their check');
            debug(error);
        }
    })
};

workers.alertUserToStatusChange = (newCheckData) => {
    const msg = 'Alert: Your check for ' + newCheckData.method.toUpperCase() + ' ' + newCheckData.protocol + '://' + newCheckData.url + ' is currently ' + newCheckData.state;
    helpers.sendSms(newCheckData.userPhone, msg, (err) => {
      if(!err){
        debug("Success: User was alerted to a status change in their check, via sms: ",msg);
      } else {
        debug("Error: Could not send sms alert to user who had a state change in their check",err);
      }
    });
};

workers.log = (originalCheckData, newCheckOutCome, state, alertWarranted, timeOfCheck) => {
    const logData = {
        'check': originalCheckData,
        'outCome': newCheckOutCome,
        state,
        'alert': alertWarranted,
        'time': timeOfCheck,
    };

    const logString = JSON.stringify(logData);

    const logFileName = originalCheckData.id;

    _logs.append(logFileName, logString, (error) => {
        if (!error) {
            debug('Logging to file succeeded');
        } else {
            debug('Logging to file error');
        }
    })
};

workers.loop = () => {
    setInterval(() => {
        workers.gatherAllChecks();
    }, 1000 * 60);
};

workers.rotateLogs = () => {
    _logs.list(false, (error, logs) => {
        if (!error && logs && logs.length > 0) {
            logs.forEach((logName) => {
                const logId = logName.replace('.log', '');

                const newFileId = logId + '-' + Date.now();
                _logs.compress(logId, newFileId, (error) => {
                    if (!error) {
                        _logs.truncate(logId, (error) => {
                            if (!error) {
                                debug('Success truncating a log file');
                            } else {
                                debug('Error truncating a log file');
                            }
                        });
                    } else {
                        debug('Error compressing one of the log files');
                        debug(error);
                    }
                });
            });
        } else {
            debug('Error could not find any logs to rotate');
        }
    });
};

workers.logRotationLoop = () => {
    setInterval(() => {
        workers.rotateLogs();
    }, 1000 * 60 * 60 * 24);
};

workers.init = () => {

    console.log('\x1b[33m%s\x1b[0m', 'Background workers are running');
    workers.gatherAllChecks();

    workers.loop();

    workers.rotateLogs();

    workers.logRotationLoop();
};

module.exports = workers;