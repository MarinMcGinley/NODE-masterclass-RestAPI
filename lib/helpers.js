const crypto = require('crypto');

const config = require('./config');
const querystring = require('querystring');
const https = require('https');

helpers = {};

helpers.hash = (str) => {
    if (typeof(str) == 'string' && str.length > 0) {
        return crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
    } else return false;
} 

helpers.parseJsonToObject = (str) => {
    try {
        return JSON.parse(str);
    } catch (error) {
        return {};
    }
}

helpers.createRandomString = (strLength) => {
  
    strLength = typeof(strLength) == 'number' && strLength > 0 ? strLength : false;
    
    if (strLength) {
        const possibleCharacters = 'abcdefghijklmnopqrstuvwzxy0123456789';

        let str = '';

        for (let i = 1; i<=strLength; i++) {
            const randomChar = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));

            str += randomChar;
        }

        return str;
    } else {
        return false;
    }
}

helpers.sendSms = (phoneNumber, msg, cb) => {
    phoneNumber = typeof(phoneNumber) == 'string' && phoneNumber.trim().length == 7 ? phoneNumber.trim() : false;
    msg = typeof(msg) == 'string' && msg.trim().length > 0 && msg.trim().length <= 1600 ? msg.trim() : false;

    if (phoneNumber && msg) {
        const payload = {
            'From': config.twilio.fromPhone,
            'To': '+354' + phoneNumber,
            'Body': msg
        };

        const stringPayload = querystring.stringify(payload);

        const requestDetails = {
            'protocol': 'https:',
            'hostname': 'api.twilio.com',
            'method': 'POST',
            'path': '/2010-04-01/Accounts/'+config.twilio.accountSid + '/Messages.json',
            'auth': config.twilio.accountSid + ':' + config.twilio.authToken,
            'headers': {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(stringPayload),
            }
        }

        const req = https.request(requestDetails, (res) => {
            const status = res.statusCode;

            if (status == 200 || status == 201) {
                cb(false);
            } else {
                cb('Status code returned was ' + status);
            }
        });

        req.on('error', (error) => {
            cb(error);
        });

        req.write(stringPayload);
        req.end();
    } else {
        cb('Given parameters were missing or invalid');

    }
}

module.exports = helpers;