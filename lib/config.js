const environments = {};

environments.staging = {
    'httpPort': 3000,
    'httpsPort': 3001,
    'envName': 'staging',
    'hashingSecret': 'ThisIsASecret',
    'maxChecks': 5
};

environments.production = {
    'httpPort': 8000,
    'httpsPort': 8001, 
    'envName': 'production',
    'hashingSecret': 'ThisIsAlsoASecret',
    'maxChecks': 5
};

const currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : '';

const environmentToExport = typeof(environments[currentEnvironment]) == 'object' ? environments[currentEnvironment] : environments.staging;

module.exports = environmentToExport;