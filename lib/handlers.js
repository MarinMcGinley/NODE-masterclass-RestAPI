const _data = require('./data');
const helpers = require('./helpers');
const config = require('./config');

const handlers = {};

handlers.ping = (data, cb) => {
    cb(200); 
};

handlers.notFound = (data, cb) => {
    cb(404);
};

handlers.users = (data, cb) => {
    const acceptableMethods = ['POST', 'GET', 'PUT', 'DELETE'];
    if (acceptableMethods.indexOf(data.method) > -1) {
        handlers._users[data.method] (data, cb);
    } else {
        cb(405);
    }
};

handlers.tokens = (data, cb) => {
    const acceptableMethods = ['POST', 'GET', 'PUT', 'DELETE'];
    if (acceptableMethods.indexOf(data.method) > -1) {
        handlers._tokens[data.method] (data, cb);
    } else {
        cb(405);
    }
};

handlers.checks = (data, cb) => {
    const acceptableMethods = ['POST', 'GET', 'PUT', 'DELETE'];
    if (acceptableMethods.indexOf(data.method) > -1) {
        handlers._checks[data.method] (data, cb);
    } else {
        cb(405);
    }
};

handlers._users = {};
handlers._tokens = {};
handlers._checks = {};

handlers._users.POST = (data, cb) => {
    const firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    const lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    const phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 7 ? data.payload.phone.trim() : false;
    const password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    const tosAgreement = typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? data.payload.tosAgreement : false;

    if (firstName && lastName && phone && password && tosAgreement) {
        _data.read('users', phone, (error, data) => {
            if (error) {
                const hashedPassword = helpers.hash(password);

                if (hashedPassword) {
                    const userObject = {
                        firstName,
                        lastName,
                        phone,
                        hashedPassword,
                        tosAgreement,
                    }
    
                    _data.create('users', phone, userObject, (error) => {
                        if (!error) {
                            cb(200);
                        } else {
                            console.log(error);
                            cb(400, {'Error': 'Could not create the new user'});
                        }
                    }); 
                } else {
                    cb(500, {'Error': 'Could not hash the password'});
                }

                
            } else {
                cb(400, {'Error': 'A user with that phone number already exists'});
            }
        });
    } else {
        cb(400, {'error': 'missing required fields'});
    }
};

handlers._users.GET = (data, cb) => {
    // athuga að phone er hér tekið úr query!!! ekki body 
    const phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 7 ? data.queryStringObject.phone.trim() : false;
    
    if (phone) {
        const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
        handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
            if (tokenIsValid) {
                _data.read('users', phone, (error, data) => {
                    if (!error && data) {
                        delete data.hashedPassword;
                         cb(200, data);
                    } else {
                        cb(404);
                    }
                });
            } else {
                cb (403, {'Error': 'Missing required token in header'});
            }
        })
    } else {
        cb(400, {'Error': 'Missing required field'});
    }
};

handlers._users.PUT = (data, cb) => {
    // phone is required, others are optional
    const firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    const lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    const phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 7 ? data.payload.phone.trim() : false;
    const password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

    if (phone) {     
        if (firstName || lastName || password) {
            const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
            handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
                if (tokenIsValid) {
                    _data.read('users', phone, (error, userData) => {
                        if (!error && userData) {
                            if (firstName) {
                                userData.firstName = firstName;
                            }
                            if (lastName) {
                                userData.lastName = lastName;
                            }
                            if (password) {
                                userData.hashedPassword = helpers.hash(password);
                            }
                            _data.update('users', phone, userData, (error) => {
                                if (!error) {
                                    cb(200);
                                } else {
                                    cb(500, {'Error': 'Could not update the user'});
                                }
                            });
                        } else {
                            cb(400, {'Error': 'The specified user does not exist'});
                        }
                    })
                } else {
                    cb (403, {'Error': 'Missing required token in header'});
                }
            }); 
        } else {
            cb (400, {'Error': 'Missing required field'});
        }
    } else {
        cb(400, {'Error': 'Missing required field'});
    }
};

handlers._users.DELETE = (data, cb) => {
    const phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 7 ? data.queryStringObject.phone.trim() : false;
    if (phone) {
        const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
            handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
                if (tokenIsValid) { 
                    _data.read('users', phone, (error, data) => {
                        if (!error && data) {
                            _data.delete('users', phone, (error, data) => {
                                if (!error) {
                                    cb(200);
                                } else {
                                    cb(500, {'Error': 'Could not find the specified user'});
                                }
                            });
                        } else {
                            cb(400, {'Error' : 'Could not find specified user'});
                        }
                    });
                } else {
                    cb (403, {'Error': 'Missing required token in header'});
                }
            });
    } else {
        cb(400, {'Error': 'Missing required field'});
    }
};

handlers._tokens.POST = (data, cb) => {
    const phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 7 ? data.payload.phone.trim() : false;
    const password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    
    if (phone && password) {
        _data.read('users', phone, (error, data) => {
            if (!error && data) {
                const hashedPassword = helpers.hash(password);

                console.log('hashedPassword: ' + hashedPassword);
                console.log('data.password: ' + data.password);
                if (hashedPassword == data.hashedPassword) {
                    const tokenId = helpers.createRandomString(20);

                    const expires = Date.now() + 1000 * 60 * 60;

                    const tokenObject = {
                        phone,
                        'id': tokenId,
                        expires
                    };

                    _data.create('tokens', tokenId, tokenObject, (error) => {
                        if (!error) {
                            cb(200, tokenObject);
                        } else {
                            cb(500, {'Error': 'Could not create new token'});
                        }
                    });
                
                } else {
                    cb(400, {'Error': 'Password did not match the specified users stored password'});
                }
            } else {
                cb (400, {'Error': 'Could not find user'})
            }
        });

    } else {
        cb(400, {'Error': 'Missing required field'});
    }
};

handlers._tokens.GET = (data, cb) => {
    const id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
    if (id) {
        _data.read('tokens', id, (error, tokenData) => {
            if (!error && tokenData) {
                 cb(200, tokenData);
            } else {  
                cb(404);
            }
        });
    } else {
        cb(400, {'Error': 'Token is not correct'});
    }
};

handlers._tokens.PUT = (data, cb) => {
    const id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;
    const extend = typeof(data.payload.extend) == 'boolean' && data.payload.extend == true ? data.payload.extend : false;

    if (extend && id) {
        _data.read('tokens', id, (error, tokenData) => {
            if (!error && tokenData) {
                if(tokenData.expires > Date.now()) {
                    tokenData.expires = Date.now() + 1000 * 60 * 60;
                    _data.update('tokens', id, tokenData, (error) => {
                        if (!error) {
                            cb(200);
                        } else {
                            cb(500, {'Error': 'Could not update the tokens expiration time'})
                        }
                    })
                } else {
                    cb(400, {'Error': 'The token has already expired and cannot be extended'});
                }
            } else {
                cb(400, {'Error': 'Specified token does not exist'});
            }
        });

    } else {
        cb(400, {'Error': 'Missing required field(s) or field(s) are invalid'});
    }
};


handlers._tokens.DELETE = (data, cb) => {
    const id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
    if (id) {
        _data.read('tokens', id, (error, data) => {
            if (!error && data) {
                _data.delete('tokens', id, (error) => {
                    if (!error) {
                        cb(200);
                    } else {
                        cb(500, {'Error': 'Could not find the specified token'});
                    }
                });
            } else {
                cb(400, {'Error' : 'Could not find specified token'});
            }
        });
    } else {
        cb(400, {'Error': 'Missing required field'});
    } 
};

handlers._checks.POST = (data, cb) => {
    const protocol = typeof(data.payload.protocol) == 'string' && ['http', 'https'].indexOf(data.payload.protocol) > -1? data.payload.protocol : false;
    const url = typeof(data.payload.url) == 'string' && data.payload.url.length > 0? data.payload.url.trim() : false;
    const method = typeof(data.payload.method) == 'string' && ['POST', 'GET', 'PUT', 'DELETE'].indexOf(data.payload.method) > -1? data.payload.method : false;
    const successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0? data.payload.successCodes : false;
    const timeOutSeconds = typeof(data.payload.timeOutSeconds) == 'number' && data.payload.timeOutSeconds % 1 == 0 && data.payload.timeOutSeconds >= 1 &&
        data.payload.timeOutSeconds <= 5 ? data.payload.timeOutSeconds: false;
    
    if (protocol && url && method && successCodes && timeOutSeconds) {
        const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

        _data.read('tokens', token, (error, tokenData) => {
            if (!error && tokenData) {
                const userPhone = tokenData.phone;
                _data.read('users', userPhone, (error, userData) => {
                    if (!error && userData) {
                        const userCheck = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];

                        if (userCheck.length < config.maxChecks) {
                            const checkId = helpers.createRandomString(20);

                            const checkObject = {
                                'id': checkId,
                                userPhone,
                                protocol,
                                url,
                                method,
                                successCodes,
                                timeOutSeconds
                            };

                            _data.create('checks', checkId, checkObject, (error) => {
                                if (!error) {

                                    userData.checks = userCheck;
                                    userData.checks.push(checkId);

                                    _data.update('users', userPhone, userData, (error) => {
                                        if (!error) {
                                            cb(200, checkObject);
                                        } else {
                                            cb(500, {'Error': 'Could not update the user with the new check'});
                                        }
                                    });

                                } else {
                                    cb(500, {'Error': 'Could not create new check'});
                                }
                            });
                        } else {
                            cb(400, {'Error': 'The user already has the maximum number of checks'});
                        }
                    } else {
                        cb(403, {'Error': 'Unable to read user from phone'});
                    }
                });
            } else {
                cb(403, {'Error': 'Token does not exist or is expired'});
            }
        });

    } else {
        cb(400, {'Error': 'Missing required inputs, or inputs are invalid'});
    }
};

handlers._checks.GET = (data, cb) => {
    const id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
    
    if (id) {
        _data.read('checks', id, (error, checkData) => {
            if (!error && checkData) {
                const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
                
                handlers._tokens.verifyToken(token, checkData.userPhone, (tokenIsValid) => {
                    if (tokenIsValid) {
                        
                        cb(200, checkData);
                    
                    } else {
                        cb (403, {'Error': 'Missing required token in header'});
                    }
                });
            } else {
                cb(404);
            }
        });
    } else {
        cb(400, {'Error': 'Missing required field'});
    }
}

handlers._checks.PUT = (data, cb) => {
    const id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;

    const protocol = typeof(data.payload.protocol) == 'string' && ['http', 'https'].indexOf(data.payload.protocol) > -1? data.payload.protocol : false;
    const url = typeof(data.payload.url) == 'string' && data.payload.url.length > 0? data.payload.url.trim() : false;
    const method = typeof(data.payload.method) == 'string' && ['POST', 'GET', 'PUT', 'DELETE'].indexOf(data.payload.method) > -1? data.payload.method : false;
    const successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0? data.payload.successCodes : false;
    const timeOutSeconds = typeof(data.payload.timeOutSeconds) == 'number' && data.payload.timeOutSeconds % 1 == 0 && data.payload.timeOutSeconds >= 1 &&
        data.payload.timeOutSeconds <= 5 ? data.payload.timeOutSeconds: false;
    
    if (id) {     
        if (protocol || url || method || successCodes || timeOutSeconds) {
            const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
            _data.read('checks', id, (error, checkData) => {
                if (!error && checkData) {
                    handlers._tokens.verifyToken(token, checkData.userPhone, (tokenIsValid) => {
                        if (tokenIsValid) {
                            if (protocol) {
                                checkData.protocol = protocol;
                            }
                            if (url) {
                                checkData.url = url;
                            }
                            if (method) {
                                checkData.method = method;
                            } 
                            if (successCodes) {
                                checkData.successCodes = successCodes;
                            }
                            if (timeOutSeconds) {
                                checkData.timeOutSeconds = timeOutSeconds;
                            }
                            _data.update('checks', id, checkData, (error) => {
                                if (!error) {
                                    cb(200);
                                } else {
                                    cb(500, {'Error': 'Could not update the check'});
                                }
                            });
                        }
                        else {
                            cb(403, {'Error': 'Token is not valid'});
                        }
                    });
                } else {
                    cb(403, {'Error': 'The specified check does not exist'});
                }
            }); 
        } else {
            cb (400, {'Error': 'Missing required field'});
        }
    } else {
        cb(400, {'Error': 'Missing required field'});
    }
};

handlers._checks.DELETE = (data, cb) => {
    const id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
    
    if (id) {
        _data.read('checks', id, (error, checkData) => {
            if (!error && checkData) {
                const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
                handlers._tokens.verifyToken(token, checkData.userPhone, (tokenIsValid) => {
                    if (tokenIsValid) { 
                        _data.delete('checks', id, (error) => {
                            if (!error) {
                                _data.read('users', checkData.userPhone, (error, userData) => {
                                    if (!error && userData) {
                                        const userCheck = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];

                                        const checkedPosition = userCheck.indexOf(id);

                                        if (checkedPosition > -1) {
                                            userCheck.splice(checkedPosition, 1);

                                            _data.update('users', checkData.userPhone, userData, (error) => {
                                                if (!error) {
                                                    cb(200);
                                                } else {
                                                    cb(500, {'Error': 'Could not update the user'});
                                                }
                                            });
                                        } else {
                                            cb(500, {'Error': 'Could not find the checks from the user, so could not remove it'});
                                        }
                                        
                                    } else {
                                        cb(500, {'Error' : 'Could not find the user who could not create the user, unable to delete the check on the user object'});
                                    }
                                });
                            } else {
                                cb(500, {'Error': 'Unable to delete check'});
                            }
                        });
                    } else {
                        cb (403, {'Error': 'Missing required token in header'});
                    }
                });
            } else {
                cb(400, {'Error' : 'Could not find specified check id, does not exist'});
            }
        });
    } else {
        cb(400, {'Error': 'Missing required field'});
    } 
};

handlers._tokens.verifyToken = (id,  phone, cb) => {
    _data.read('tokens', id, (error, tokenData) => {
        if (!error && tokenData) {
            if (tokenData.phone == phone && tokenData.expires > Date.now()) {
                cb(true);
            } else {
                cb(false);
            }
        } else {
            cb(false);
        }
    });
}

module.exports = handlers;