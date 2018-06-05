var response = require('cfn-response');
exports.handler = function(event, context) {
    var responseData = {Value: 12 * 5};
    response.send(event, context, response.SUCCESS, responseData);
};