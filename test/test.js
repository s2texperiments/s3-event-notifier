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

    let s3GetBucketNotificationConfigFake;
    let s3GetBucketNotificationConfigOtherNotLambdaEventsFake;
    let s3GetBucketNotificationConfigOtherLambdaEventsFake;
    let s3GetBucketNotificationConfigLambdaEventWithSameIdFake;

    let s3PutBucketNotificationConfigFake;

    let underTest;

    let cfCreateEvent;
    let cfUpdateEvent;
    let cfDeleteEvent;

    const defaultExpectedNotificationId = 'arn:aws:cloudformation:eu-west-1:099687127161:stack/s2t-base/3d992e90-691c-11e8-96cc-50faeb5cc8d2:s3EventNotifier:s2tTrackAllS3';
    const expectedCreateLambdaFnArn = 'arn:aws:lambda:eu-west-1:099687127161:function:s2t-base-s2tIncomingNotTranscodedFileEventHandler-1IVY6J7ZLXR01';
    const expectedUpdateLambdaFnArn = 'arn:aws:lambda:eu-west-1:099687127161:function:s2t-base-s2tUpdatedEventHandler-1IVY6J7ZLXR01';

    beforeEach(() => {
        successFake = fake.resolves("send suc");
        failFake = fake.resolves("send fail");

        s3PutBucketNotificationConfigFake = fake.resolves({status: 'successful'});

        s3GetBucketNotificationConfigFake = fake.resolves(JSON.parse(fs.readFileSync('test/s3GetBucketNotificationConfigurationEmpty.json', 'utf8')));
        s3GetBucketNotificationConfigOtherLambdaEventsFake = fake.resolves(JSON.parse(fs.readFileSync('test/s3GetBucketNotificationConfigurationOtherLambdaEvents.json', 'utf8')));
        s3GetBucketNotificationConfigOtherNotLambdaEventsFake = fake.resolves(JSON.parse(fs.readFileSync('test/s3GetBucketNotificationConfigurationOtherNotLambdaEvents.json', 'utf8')));
        s3GetBucketNotificationConfigLambdaEventWithSameIdFake = fake.resolves(JSON.parse(fs.readFileSync('test/s3GetBucketNotificationConfigurationLambdaEventWithSameId.json', 'utf8')));

        underTest = proxyquire('../index_impl.js', {
            'cf-fetch-response': {
                sendSuccess: successFake,
                sendFail: failFake
            },
            './s3Api': {
                putBucketNotificationConfiguration: s3PutBucketNotificationConfigFake,
                getBucketNotificationConfiguration: s3GetBucketNotificationConfigFake
            }
        });

        cfCreateEvent = JSON.parse(fs.readFileSync('test/cfCreateEventData.json', 'utf8'));
        cfUpdateEvent = JSON.parse(fs.readFileSync('test/cfUpdateEventData.json', 'utf8'));
        cfDeleteEvent = JSON.parse(fs.readFileSync('test/cfDeleteEventData.json', 'utf8'));
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('Missing mandatory arguments should result into rejection', () => {
        it('S3Bucket', async () => {
            delete cfCreateEvent.ResourceProperties.S3Bucket;
            return expect(underTest.handler(cfCreateEvent, cfContext)).be.rejected;
        });

        it('S3Event', async () => {
            delete cfCreateEvent.ResourceProperties.S3Event;
            return expect(underTest.handler(cfCreateEvent, cfContext)).be.rejected;
        });

        it('EventLambdaArn', async () => {
            delete cfCreateEvent.ResourceProperties.EventLambdaArn;
            return expect(underTest.handler(cfCreateEvent, cfContext)).be.rejected;
        });
    });

    describe('Failed service calls should result into rejection', () => {

        it('failing s3.getBucketNotificationConfiguration call', async () => {
            underTest = proxyquire('../index_impl.js', {
                'cf-fetch-response': {
                    sendSuccess: successFake,
                    sendFail: failFake
                },
                './s3Api': {
                    putBucketNotification: s3PutBucketNotificationConfigFake,
                    getBucketNotificationConfiguration: fake.rejects({reason: 'permission denied'})
                }
            });

            return expect(underTest.handler(cfCreateEvent, cfContext)).be.rejected;
        });

        it('failing s3.putBucketNotification call', async () => {
            underTest = proxyquire('../index_impl.js', {
                'cf-fetch-response': {
                    sendSuccess: successFake,
                    sendFail: failFake
                },
                './s3Api': {
                    putBucketNotification: fake.rejects({reason: 'permission denied'}),
                    getBucketNotificationConfiguration: s3GetBucketNotificationConfigFake
                }
            });

            return expect(underTest.handler(cfCreateEvent, cfContext)).be.rejected;
        });
    });

    describe('Create new S3 Lambda Notification Event', () => {
        it('Bucket has no other S3 events -> add -> succeed ', async () => {

            await underTest.handler(cfCreateEvent, cfContext);

            expectSuccessCFResponse();

            let [event, context, custom] = successFake.firstCall.args;
            expectByPass(event, context);

            let data = expectCustomData(custom);
            expectCustomDataNotificatinId(data);

            let [s3PutParam] = s3PutBucketNotificationConfigFake.firstCall.args;
            expectS3Bucket(s3PutParam);

            expectTopicConfigurations(s3PutParam);
            expectQueueConfigurations(s3PutParam);

            let [s3PutNotifyLambdaConfig] = expectLambdaFunctionConfigurations(s3PutParam);

            expect(s3PutNotifyLambdaConfig).to.have.all.keys('Events', 'LambdaFunctionArn', 'Id');
            expectPutNotificationEvent(s3PutNotifyLambdaConfig.Events);
            expectPutNotificationLambdaArn(s3PutNotifyLambdaConfig.LambdaFunctionArn);
            expectPutNotificationId(s3PutNotifyLambdaConfig.Id);
        });

        it('Bucket contains another S3 lambda events -> merge -> succeed', async () => {

            let underTest = proxyquire('../index_impl.js', {
                'cf-fetch-response': {
                    sendSuccess: successFake,
                    sendFail: failFake
                },
                './s3Api': {
                    putBucketNotificationConfiguration: s3PutBucketNotificationConfigFake,
                    getBucketNotificationConfiguration: s3GetBucketNotificationConfigOtherLambdaEventsFake
                }
            });

            await underTest.handler(cfCreateEvent, cfContext);

            expectSuccessCFResponse();

            let [event, context, custom] = successFake.firstCall.args;
            expectByPass(event, context);

            let data = expectCustomData(custom);
            expectCustomDataNotificatinId(data);

            let [s3PutParam] = s3PutBucketNotificationConfigFake.firstCall.args;
            expectS3Bucket(s3PutParam);

            expectTopicConfigurations(s3PutParam);
            expectQueueConfigurations(s3PutParam);

            let [s3AlreadyExistingNotifyLambdaConfig1, s3AlreadyExistingNotifyLambdaConfig2, s3PutNotifyLambdaConfig] =
                expectLambdaFunctionConfigurations(s3PutParam, {expectedSize: 3});

            expect(s3AlreadyExistingNotifyLambdaConfig1).include({Id: 'lambdaConfig1'});
            expect(s3AlreadyExistingNotifyLambdaConfig2).include({Id: 'lambdaConfig2'});


            expect(s3PutNotifyLambdaConfig).to.have.all.keys('Events', 'LambdaFunctionArn', 'Id');
            expectPutNotificationEvent(s3PutNotifyLambdaConfig.Events);
            expectPutNotificationLambdaArn(s3PutNotifyLambdaConfig.LambdaFunctionArn);
            expectPutNotificationId(s3PutNotifyLambdaConfig.Id);
        });

        it('Bucket contains another S3 events (but not lambda events) -> merge -> succeed', async () => {

            let underTest = proxyquire('../index_impl.js', {
                'cf-fetch-response': {
                    sendSuccess: successFake,
                    sendFail: failFake
                },
                './s3Api': {
                    putBucketNotificationConfiguration: s3PutBucketNotificationConfigFake,
                    getBucketNotificationConfiguration: s3GetBucketNotificationConfigOtherNotLambdaEventsFake
                }
            });

            await underTest.handler(cfCreateEvent, cfContext);

            expectSuccessCFResponse();

            let [event, context, custom] = successFake.firstCall.args;
            expectByPass(event, context);

            let data = expectCustomData(custom);
            expectCustomDataNotificatinId(data);

            let [s3PutParam] = s3PutBucketNotificationConfigFake.firstCall.args;
            expectS3Bucket(s3PutParam);

            let [s3PutNotifyTopicConfig1, s3PutNotifyTopicConfig2] = expectTopicConfigurations(s3PutParam, {expectedSize: 2});
            expect(s3PutNotifyTopicConfig1).include({Id: 'topicConfig1'});
            expect(s3PutNotifyTopicConfig2).include({Id: 'topicConfig2'});

            let [s3PutNotifyQueueConfig1, s3PutNotifyQueueConfig2] = expectQueueConfigurations(s3PutParam, {expectedSize: 2});
            expect(s3PutNotifyQueueConfig1).include({Id: 'queueConfig1'});
            expect(s3PutNotifyQueueConfig2).include({Id: 'queueConfig2'});

            let [s3PutNotifyLambdaConfig] = expectLambdaFunctionConfigurations(s3PutParam);

            expect(s3PutNotifyLambdaConfig).to.have.all.keys('Events', 'LambdaFunctionArn', 'Id');
            expectPutNotificationEvent(s3PutNotifyLambdaConfig.Events);
            expectPutNotificationLambdaArn(s3PutNotifyLambdaConfig.LambdaFunctionArn);
            expectPutNotificationId(s3PutNotifyLambdaConfig.Id);
        });

        it('Bucket contains S3 lambda event with same identifier -> rejected', async () => {

            underTest = proxyquire('../index_impl.js', {
                'cf-fetch-response': {
                    sendSuccess: successFake,
                    sendFail: failFake
                },
                './s3Api': {
                    putBucketNotificationConfiguration: s3PutBucketNotificationConfigFake,
                    getBucketNotificationConfiguration: s3GetBucketNotificationConfigLambdaEventWithSameIdFake
                }
            });

            return expect(underTest.handler(cfCreateEvent, cfContext)).be.rejected;
        });

    });

    describe('Update existing S3 Lambda Notification Event', () => {

        it('No given Events -> rejected', async () => {
            return expect(underTest.handler(cfUpdateEvent, cfContext)).be.rejected;
        });

        it('Event with requested Id does not exists -> rejected', async () => {

            let underTest = proxyquire('../index_impl.js', {
                'cf-fetch-response': {
                    sendSuccess: successFake,
                    sendFail: failFake
                },
                './s3Api': {
                    putBucketNotificationConfiguration: s3PutBucketNotificationConfigFake,
                    getBucketNotificationConfiguration: s3GetBucketNotificationConfigOtherLambdaEventsFake
                }
            });

            return expect(underTest.handler(cfUpdateEvent, cfContext)).be.rejected;
        });

        it('Event with requested Id exists -> update -> succeed', async () => {

            let underTest = proxyquire('../index_impl.js', {
                'cf-fetch-response': {
                    sendSuccess: successFake,
                    sendFail: failFake
                },
                './s3Api': {
                    putBucketNotificationConfiguration: s3PutBucketNotificationConfigFake,
                    getBucketNotificationConfiguration: s3GetBucketNotificationConfigLambdaEventWithSameIdFake
                }
            });

            await underTest.handler(cfUpdateEvent, cfContext);

            expectSuccessCFResponse();

            let [event, context, custom] = successFake.firstCall.args;
            expectByPass(event, context, {expectedEvent: cfUpdateEvent});

            let data = expectCustomData(custom);
            expectCustomDataNotificatinId(data);

            let [s3PutParam] = s3PutBucketNotificationConfigFake.firstCall.args;
            expectS3Bucket(s3PutParam);

            expectTopicConfigurations(s3PutParam);
            expectQueueConfigurations(s3PutParam);

            let [s3AlreadyExistingNotifyLambdaConfig1, s3PutNotifyLambdaConfig] =
                expectLambdaFunctionConfigurations(s3PutParam, {expectedSize: 2});

            expect(s3AlreadyExistingNotifyLambdaConfig1).include({Id: 'lambdaConfig1'});


            expect(s3PutNotifyLambdaConfig).to.have.all.keys('Events', 'LambdaFunctionArn', 'Id');
            expectPutNotificationEvent(s3PutNotifyLambdaConfig.Events);
            expectPutNotificationLambdaArn(s3PutNotifyLambdaConfig.LambdaFunctionArn, {expectedArn: expectedUpdateLambdaFnArn});
            expectPutNotificationId(s3PutNotifyLambdaConfig.Id);

        });

    });

    describe('Delete S3 Lambda Notification Event', () => {

        // it('Event with requested Id exists -> update -> succeed', async () => {
        //     throw "missing";
        // });
        //
        // it('No given Events -> succeed', async () => {
        //     throw "missing";
        // });
        //
        // it('Event with requested Id does not exists -> succeed', async () => {
        //     throw "missing";
        // });
    });

    describe('S3 Lambda Notification Event Filter', () => {

        it('with prefix filter', async () => {

            Object.assign(cfCreateEvent.ResourceProperties, {
                S3Prefix: '/w/t/f'
            });

            await underTest.handler(cfCreateEvent, cfContext);

            let [event, context, custom] = successFake.firstCall.args;
            expectByPass(event, context);

            let data = expectCustomData(custom);
            expectCustomDataNotificatinId(data);

            let [s3PutParam] = s3PutBucketNotificationConfigFake.firstCall.args;
            expectS3Bucket(s3PutParam);

            expectTopicConfigurations(s3PutParam);
            expectQueueConfigurations(s3PutParam);

            let [s3PutNotifyLambdaConfig] = expectLambdaFunctionConfigurations(s3PutParam);

            expect(s3PutNotifyLambdaConfig).to.have.all.keys('Events', 'LambdaFunctionArn', 'Id', 'Filter');
            expectPutNotificationEvent(s3PutNotifyLambdaConfig.Events);
            expectPutNotificationLambdaArn(s3PutNotifyLambdaConfig.LambdaFunctionArn);
            expectPutNotificationId(s3PutNotifyLambdaConfig.Id);

            let [suffixRule] = expectPutNotificationFilterRules(s3PutNotifyLambdaConfig.Filter);

            expectFilterRule(suffixRule, {
                name: 'prefix',
                value: '/w/t/f'
            });
        });

        it('with suffix filter', async () => {

            Object.assign(cfCreateEvent.ResourceProperties, {
                S3Suffix: '.png'
            });

            await underTest.handler(cfCreateEvent, cfContext);

            let [event, context, custom] = successFake.firstCall.args;
            expectByPass(event, context);

            let data = expectCustomData(custom);
            expectCustomDataNotificatinId(data);

            let [s3PutParam] = s3PutBucketNotificationConfigFake.firstCall.args;
            expectS3Bucket(s3PutParam);

            expectTopicConfigurations(s3PutParam);
            expectQueueConfigurations(s3PutParam);

            let [s3PutNotifyLambdaConfig] = expectLambdaFunctionConfigurations(s3PutParam);

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

        it('with prefix and suffix filter', async () => {

            Object.assign(cfCreateEvent.ResourceProperties, {
                S3Prefix: 'w/t/f',
                S3Suffix: '.png'
            });

            await underTest.handler(cfCreateEvent, cfContext);

            let [event, context, custom] = successFake.firstCall.args;
            expectByPass(event, context);

            let data = expectCustomData(custom);
            expectCustomDataNotificatinId(data);

            let [s3PutParam] = s3PutBucketNotificationConfigFake.firstCall.args;
            expectS3Bucket(s3PutParam);

            expectTopicConfigurations(s3PutParam);
            expectQueueConfigurations(s3PutParam);

            let [s3PutNotifyLambdaConfig] = expectLambdaFunctionConfigurations(s3PutParam);

            expect(s3PutNotifyLambdaConfig).to.have.all.keys('Events', 'LambdaFunctionArn', 'Id', 'Filter');
            expectPutNotificationEvent(s3PutNotifyLambdaConfig.Events);
            expectPutNotificationLambdaArn(s3PutNotifyLambdaConfig.LambdaFunctionArn);
            expectPutNotificationId(s3PutNotifyLambdaConfig.Id);

            let [prefixRule, suffixRule] = expectPutNotificationFilterRules(s3PutNotifyLambdaConfig.Filter, {
                ruleSize: 2
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
    });

    function expectSuccessCFResponse() {
        expect(successFake.callCount).to.equal(1);
        expect(failFake.callCount).to.equal(0);
    }

    function expectByPass(event, context, {expectedEvent = cfCreateEvent} = {}) {
        expect(event).to.deep.equal(expectedEvent);
        expect(context).to.deep.equal(cfContext);
    }

    function expectCustomData(custom) {
        expect(custom).include.all.keys('data');
        return custom.data;
    }

    function expectCustomDataNotificatinId(data, {expectedNotificationId = defaultExpectedNotificationId} = {}) {
        expect(data).include({
            'NotificationId': expectedNotificationId
        });
    }

    function expectS3Bucket(s3PutParam, {expectedBucket = 's2t-base-s2tbucket-vzm2iluhy0i4'} = {}) {
        expect(s3PutParam.Bucket).to.equal(expectedBucket);
    }

    function expectLambdaFunctionConfigurations(s3PutParam, {expectedSize = 1} = {}) {
        expect(s3PutParam.NotificationConfiguration.LambdaFunctionConfigurations.length).to.equal(expectedSize);
        return s3PutParam.NotificationConfiguration.LambdaFunctionConfigurations;
    }

    function expectTopicConfigurations(s3PutParam, {expectedSize = 0} = {}) {
        expect(s3PutParam.NotificationConfiguration.TopicConfigurations.length).to.equal(expectedSize);
        return s3PutParam.NotificationConfiguration.TopicConfigurations;
    }

    function expectQueueConfigurations(s3PutParam, {expectedSize = 0} = {}) {
        expect(s3PutParam.NotificationConfiguration.QueueConfigurations.length).to.equal(expectedSize);
        return s3PutParam.NotificationConfiguration.QueueConfigurations;
    }

    function expectPutNotificationEvent(events, {expectedEvent = 's3:ObjectCreated:*'} = {}) {
        expect(events.length).to.equal(1);
        expect(events[0]).to.equal(expectedEvent);
    }

    function expectPutNotificationLambdaArn(lambdaFunctionArn, {expectedArn = expectedCreateLambdaFnArn} = {}) {
        expect(lambdaFunctionArn).to.equal(expectedArn)
    }

    function expectPutNotificationId(id, {expectedNotificationId = defaultExpectedNotificationId} = {}) {
        expect(id).to.equal(expectedNotificationId);
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