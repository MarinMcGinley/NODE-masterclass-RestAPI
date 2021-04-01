const fs = require('fs');
const path = require('path');
const helpers = require('./helpers');

const lib = {};

lib.baseDir = path.join(__dirname, '/../.data');

lib.create = (dir, file, data, cb) => {
    fs.open(lib.baseDir+'/'+dir+'/'+file+'.json', 'wx', (error, fileDescriptor) => {
        
        if (!error && fileDescriptor) {
            const stringData = JSON.stringify(data);

            fs.writeFile(fileDescriptor, stringData, (error) => {
                if (!error) {
                    fs.close(fileDescriptor, (error) => {
                        if (!error) {
                            cb(false);
                        } else {
                            cb('Error closing new file');
                        }
                    })
                } else {
                    cb('Error writing to new file');
                }
            })
        } else {
            console.log(error);
            cb('Could not create file, may not exist');
        }
    });
};

lib.read = (dir, file, cb) => {
    fs.readFile(lib.baseDir + '/' + dir + '/'+ file + '.json', 'utf-8', (error, data) => {
        if (!error && data) {
            const parsedData = helpers.parseJsonToObject(data);
            cb(false, parsedData);
        } else {
            cb(error, data);
        }
    });
};

lib.update = (dir, file, data, cb) => {
    fs.open(lib.baseDir+'/'+dir+'/'+file+'.json', 'r+', (error, fileDescriptor) => {
        if (!error && fileDescriptor) {
            var stringData = JSON.stringify(data);

            fs.truncate(fileDescriptor, (error) => {
                if (!error) {
                    fs.writeFile(fileDescriptor, stringData, (error) => {
                        if (!error) {
                            fs.close(fileDescriptor, (error) => {
                                if (!error) {
                                    cb(false);
                                } else {
                                    cb('Error closing the file');
                                }
                            })
                        } else {
                            cb('Error writing to existing file');
                        }
                    })
                } else {
                    cb('Error truncating file');
                }
            })
        } else {
            cb('Could not open the file for updating, it may not exist yet');
        }
    })
}

lib.delete = (dir, file, cb) => {
    fs.unlink(lib.baseDir+'/'+dir+'/'+file+'.json', (error) => {
        if (!error) {
            cb(false);
        } else {
            cb('Error deleting file');
        }
    });
}

lib.list = (dir, cb) => {
    // lib.baseDir +  'dir' + '/'
    console.log('directory: ' + lib.baseDir + '/' + dir + '/');
    fs.readdir(lib.baseDir + '/' + dir + '/', (error, data) => {
        if (!error && data && data.length > 0) {
            const trimmedFileNames = [];
            data.forEach(fileName => {
                trimmedFileNames.push(fileName.replace('.json', ''));
            });
            cb(false, trimmedFileNames); 
        } else {
            cb(error, data);
        }
    });
}

module.exports = lib;