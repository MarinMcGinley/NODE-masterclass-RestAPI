const crypto = require('crypto');

const config = require('./config')

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

module.exports = helpers;