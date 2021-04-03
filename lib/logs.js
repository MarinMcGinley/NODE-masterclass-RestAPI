const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const lib = {};

lib.baseDir = path.join(__dirname, '/../.logs');

lib.append = (file, str, cb) => {
    fs.open(lib.baseDir + '/' + file + '.log', 'a', (error, fileDescriptor) => {
        if (!error && fileDescriptor) {
            fs.appendFile(fileDescriptor, str + '\n', (error) => {
                if (!error) {
                    fs.close(fileDescriptor, (error) => {
                        if (!error) {
                            cb(false);
                        } else {
                            cb('Error closing file that was being appended');
                        }
                    });
                } else {
                    console.log('Error appending to file');
                }
            })
        } else {
            cb('Could not open file for appending');
        }
    });
};

lib.list = (includeCompressedLogs, cb) => {
    fs.readdir(lib.baseDir, (error, data) => {
        if (!error && data) {
            const trimmedFileNames = [];

            data.forEach((fileName) => {
                if (fileName.indexOf('.log') > -1) {
                    trimmedFileNames.push(fileName.replace('.log', ''));
                }

                if (fileName.indexOf('.gz.b64') > -1 && includeCompressedLogs) {
                    trimmedFileNames.push(filename.replace('.gz.b64', ''));
                }
            });

            cb(false, trimmedFileNames);
        } else {
            cb(error, data);
        }
    });
};

lib.compress = (logId, fileId, cb) => {
    const sourceFile = logId + '.log';
    const destinationFile = fileId + '.gz.b64';

    fs.readFile(lib.baseDir + '/' + sourceFile, 'utf8', (error, inputString) => {
        if (!error, inputString) {
            zlib.gzip(inputString, (error, buffer) => {
                if (!error && buffer) {
                    fs.open(lib.baseDir + '/' + destinationFile, 'wx', (error, fileDescriptor) => {
                        if (!error && fileDescriptor) {
                            fs.writeFile(fileDescriptor, buffer.toString('base64'), (error) => {
                                if (!error) {
                                    fs.close(fileDescriptor, (error) => {
                                        if (!error) {
                                            cb(false);
                                        } else {
                                            cb(error);
                                        }
                                    });
                                } else {
                                    cb(error);
                                }
                            });
                        } else {
                            cb(error);
                        }
                    });
                } else {
                    cb(error);
                }
            });
        } else {
            cb(error);
        }
    });
};

lib.decompress = (fileId, cb) => {
    const fileName = fileId + '.gz.b64';

    fs.readFile(lib.baseDir + '/' + fileName, 'utf8', (error, str) => {
        if (!error && str) {
            const inputBuffer = Buffer.from(str, 'base64');

            zlib.unzip(inputBuffer, (error, outputBuffer) => {
                if (!error && outputBuffer) {
                    const newStr = outputBuffer.toString();

                    cb(false, newStr);
                } else {
                    cb(error);  
                }
            });
        } else {
            cb(error);
        }
    });
};

lib.truncate = (logId, cb) => {
    fs.truncate(lib.baseDir + '/' + logId + '.log', 0, (error) => {
        if (!error) {
            cb(false);
        } else {
            cb(error);
        }
    })
};

module.exports = lib;