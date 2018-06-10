const AWS = require('aws-sdk');
const s3 = new AWS.S3();

module.exports = {
    putBucketNotification: async (params) =>
        new Promise((resolve, rejected) =>
            s3.putBucketNotification(params, (err, data) =>
                err ? rejected(err) : resolve(data)))
};