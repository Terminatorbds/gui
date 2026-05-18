const httpStatusModule = require('http-status');

module.exports = httpStatusModule.status || httpStatusModule.default || httpStatusModule;