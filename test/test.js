const chai = require('chai');
chai.use(require('chai-as-promised'));
const expect = chai.expect;

const sinon = require('sinon');
const fake = require('sinon').fake;

const proxyquire = require('proxyquire').noCallThru();

const fs = require('fs');


const cfContext = JSON.parse(fs.readFileSync('test/cfContextData.json', 'utf8'));


describe('s3-event-notifier', () => {

    let successFake;
    let failFake;
    let s3putBucketNotificationFake;
    let underTest;

    let cfCreateEvent;
    let cfUpdateEvent;
    let cfDeleteEvent;

    const expectedCreateArn = 'arn:aws:cloudformation:eu-west-1:099687127161:stack/s2t-base/3d992e90-691c-11e8-96cc-50faeb5cc8d2:s3EventNotifier:s2t-base-s2tbucket-vzm2iluhy0i4:s3:ObjectCreated:*:arn:aws:lambda:eu-west-1:099687127161:function:s2t-base-s2tIncomingNotTranscodedFileEventHandler-1IVY6J7ZLXR01';
    const expectedLambdaFnArn = 'arn:aws:lambda:eu-west-1:099687127161:function:s2t-base-s2tIncomingNotTranscodedFileEventHandler-1IVY6J7ZLXR01';

    beforeEach(() => {
        successFake = fake.resolves("send suc");
        failFake = fake.resolves("send fail");
        s3putBucketNotificationFake = fake.resolves({status: 'successful'});

        underTest = proxyquire('../index_impl.js', {
            'cf-fetch-response': {
                sendSuccess: successFake,
                sendFail: failFake
            },
            './s3Api': {
                putBucketNotification: s3putBucketNotificationFake
            }
        });

        cfCreateEvent = JSON.parse(fs.readFileSync('test/cfCreateEventData.json', 'utf8'));
        cfUpdateEvent = JSON.parse(fs.readFileSync('test/cfUpdateEventData.json', 'utf8'));
        cfDeleteEvent = JSON.parse(fs.readFileSync('test/cfDeleteEventData.json', 'utf8'));


    });

    afterEach(() => {
        sinon.restore();
    });

    it('missing S3Bucket argument should promise should be rejected', async () => {
        delete cfCreateEvent.ResourceProperties.S3Bucket;
        return expect(underTest.handler(cfCreateEvent, cfContext)).be.rejected;
    });

    it('missing S3Event argument sshould promise should be rejected ', async () => {
        delete cfCreateEvent.ResourceProperties.S3Event;
        return expect(underTest.handler(cfCreateEvent, cfContext)).be.rejected;
    });

    it('missing EventLambdaArn argument should promise should be rejected ', async () => {
        delete cfCreateEvent.ResourceProperties.EventLambdaArn;
        return expect(underTest.handler(cfCreateEvent, cfContext)).be.rejected;
    });

    it('create failed (s3 request) -> send failed ', async () => {
        underTest = proxyquire('../index.js', {
            'cf-fetch-response': {
                sendSuccess: successFake,
                sendFail: failFake
            },
            './s3Api': {
                putBucketNotification: fake.rejects({reason: 'permission denied'})
            }
        });

        return expect(underTest.handler(cfCreateEvent, cfContext)).be.rejected;
    });

    it('create successful -> send success', async () => {

        await underTest.handler(cfCreateEvent, cfContext);

        expectSuccessCFResponse();

        let [event, context, custom] = successFake.firstCall.args;
        expectByPass(event, context);

        let data = expectCustomData(custom);
        expectCustomDataNotificatinId(data);

        let [s3PutParam] = s3putBucketNotificationFake.firstCall.args;
        expectS3Bucket(s3PutParam);
        let s3PutNotifyLambdaConfig = expectLambdaFunctionConfigurations(s3PutParam);

        expect(s3PutNotifyLambdaConfig).to.have.all.keys('Events', 'LambdaFunctionArn', 'Id');
        expectPutNotificationEvent(s3PutNotifyLambdaConfig.Events);
        expectPutNotificationLambdaArn(s3PutNotifyLambdaConfig.LambdaFunctionArn);
        expectPutNotificationId(s3PutNotifyLambdaConfig.Id);

    });

    it('create with prefix', async () => {

        Object.assign(cfCreateEvent.ResourceProperties, {
            S3Prefix: 'w/t/f'
        });

        await underTest.handler(cfCreateEvent, cfContext);

        let [event, context, custom] = successFake.firstCall.args;
        expectByPass(event, context);

        let data = expectCustomData(custom);
        expectCustomDataNotificatinId(data);

        let [s3PutParam] = s3putBucketNotificationFake.firstCall.args;
        expectS3Bucket(s3PutParam);
        let s3PutNotifyLambdaConfig = expectLambdaFunctionConfigurations(s3PutParam);

        expect(s3PutNotifyLambdaConfig).to.have.all.keys('Events', 'LambdaFunctionArn', 'Id', 'Filter');
        expectPutNotificationEvent(s3PutNotifyLambdaConfig.Events);
        expectPutNotificationLambdaArn(s3PutNotifyLambdaConfig.LambdaFunctionArn);
        expectPutNotificationId(s3PutNotifyLambdaConfig.Id);
        let [prefixRule] = expectPutNotificationFilterRules(s3PutNotifyLambdaConfig.Filter);

        expectFilterRule(prefixRule, {
            name: 'prefix',
            value: 'w/t/f'
        });
    });


    it('create with suffix', async () => {

        Object.assign(cfCreateEvent.ResourceProperties, {
            S3Suffix: '.png'
        });

        await underTest.handler(cfCreateEvent, cfContext);

        let [event, context, custom] = successFake.firstCall.args;
        expectByPass(event, context);

        let data = expectCustomData(custom);
        expectCustomDataNotificatinId(data);

        let [s3PutParam] = s3putBucketNotificationFake.firstCall.args;
        expectS3Bucket(s3PutParam);
        let s3PutNotifyLambdaConfig = expectLambdaFunctionConfigurations(s3PutParam);

        expect(s3PutNotifyLambdaConfig).to.have.all.keys('Events', 'LambdaFunctionArn', 'Id', 'Filter');
        expectPutNotificationEvent(s3PutNotifyLambdaConfig.Events);
        expectPutNotificationLambdaArn(s3PutNotifyLambdaConfig.LambdaFunctionArn);
        expectPutNotificationId(s3PutNotifyLambdaConfig.Id);

        let [suffixRule] = expectPutNotificationFilterRules(s3PutNotifyLambdaConfig.Filter);

        expectFilterRule(suffixRule, {
            name: 'suffix',
            value: '.png'
        });
    });


    it('create with prefix and suffix', async () => {

        Object.assign(cfCreateEvent.ResourceProperties, {
            S3Prefix: 'w/t/f',
            S3Suffix: '.png'
        });

        await underTest.handler(cfCreateEvent, cfContext);

        let [event, context, custom] = successFake.firstCall.args;
        expectByPass(event, context);

        let data = expectCustomData(custom);
        expectCustomDataNotificatinId(data);

        let [s3PutParam] = s3putBucketNotificationFake.firstCall.args;
        expectS3Bucket(s3PutParam);
        let s3PutNotifyLambdaConfig = expectLambdaFunctionConfigurations(s3PutParam);

        expect(s3PutNotifyLambdaConfig).to.have.all.keys('Events', 'LambdaFunctionArn', 'Id', 'Filter');
        expectPutNotificationEvent(s3PutNotifyLambdaConfig.Events);
        expectPutNotificationLambdaArn(s3PutNotifyLambdaConfig.LambdaFunctionArn);
        expectPutNotificationId(s3PutNotifyLambdaConfig.Id);

        let [prefixRule, suffixRule] = expectPutNotificationFilterRules(s3PutNotifyLambdaConfig.Filter,{
            ruleSize:2
        });

        expectFilterRule(prefixRule, {
            name: 'prefix',
            value: 'w/t/f'
        });

        expectFilterRule(suffixRule, {
            name: 'suffix',
            value: '.png'
        });
    });

    it('update successful -> send success', async () => {

    });

    it('update failed -> send failed', async () => {

    });

    it('delete successful -> send success', async () => {

    });

    it('delete failed (permission) -> send failed', async () => {

    });


    function expectFailCFResponse() {
        expect(successFake.callCount).to.equal(0);
        expect(failFake.callCount).to.equal(1);
    }

    function expectSuccessCFResponse() {
        expect(successFake.callCount).to.equal(1);
        expect(failFake.callCount).to.equal(0);
    }

    function expectByPass(event, context) {
        expect(event).to.deep.equal(cfCreateEvent);
        expect(context).to.deep.equal(cfContext);
    }

    function expectCustomData(custom) {
        expect(custom).include.all.keys('data');
        return custom.data;
    }

    function expectCustomDataNotificatinId(data, {expectedArn = expectedCreateArn} = {}) {
        expect(data).include({
            'NotificationId': expectedArn
        });
    }

    function expectS3Bucket(s3PutParam, {expectedBucket = 's2t-base-s2tbucket-vzm2iluhy0i4'} = {}) {
        expect(s3PutParam.Bucket).to.equal(expectedBucket);
    }

    function expectLambdaFunctionConfigurations(s3PutParam) {
        expect(s3PutParam.NotificationConfiguration.LambdaFunctionConfigurations.length).to.equal(1);
        return s3PutParam.NotificationConfiguration.LambdaFunctionConfigurations[0];
    }

    function expectPutNotificationEvent(events, {expectedEvent = 's3:ObjectCreated:*'} = {}) {
        expect(events.length).to.equal(1);
        expect(events[0]).to.equal(expectedEvent);
    }

    function expectPutNotificationLambdaArn(lambdaFunctionArn, {expectedArn = expectedLambdaFnArn} = {}) {
        expect(lambdaFunctionArn).to.equal(expectedArn)
    }

    function expectPutNotificationId(id, {expectedArn = expectedCreateArn} = {}) {
        expect(id).to.equal(expectedCreateArn);
    }

    function expectPutNotificationFilterRules(filter, {ruleSize: ruleSize = 1} = {}) {
        expect(filter).to.have.all.keys('Key');
        expect(filter.Key).to.have.all.keys('FilterRules');
        let rules = filter.Key.FilterRules;
        expect(rules.length).to.equal(ruleSize);
        return rules;
    }


    function expectFilterRule(rule, {name = '', value = ''} = {}) {
        expect(rule).to.have.all.keys('Name', 'Value');
        expect(rule.Name).to.equal(name);
        expect(rule.Value).to.equal(value);
    }

});