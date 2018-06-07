const expect = require('chai').expect;
const sinon = require('sinon');
const fake = require('sinon').fake;

const proxyquire = require('proxyquire').noCallThru();

const fs = require('fs');
const cfCreateEvent = JSON.parse(fs.readFileSync('test/cfCreateEventData.json', 'utf8'));
const cfUpdateEvent = JSON.parse(fs.readFileSync('test/cfUpdateEventData.json', 'utf8'));
const cfDeleteEvent = JSON.parse(fs.readFileSync('test/cfDeleteEventData.json', 'utf8'));

const cfContext = JSON.parse(fs.readFileSync('test/cfContextData.json', 'utf8'));


describe('s3-event-notifier', () => {

    let successFake;
    let failFake;
    let underTest;

    beforeEach(() => {
        successFake = fake.resolves("send suc");
        failFake = fake.resolves("send fail");
        underTest = proxyquire('../index.js', {
            'cf-fetch-response': {
                sendSuccess: successFake,
                sendFail: failFake
            }
        });
    });

    afterEach(()=>{
        sinon.restore();
    });

    it('missing S3Bucket argument should send fail response ', async () => {
        //hard copy
        let obj = JSON.parse(JSON.stringify(cfCreateEvent));
        delete obj.ResourceProperties.S3Bucket;
        await underTest.handler(obj, cfContext);
        expect(successFake.callCount).to.equal(0);
        expect(failFake.callCount).to.equal(1);
    });

    it('missing s3Prefix argument should send fail response ', async () => {
        //hard copy
        let obj = JSON.parse(JSON.stringify(cfCreateEvent));
        delete obj.ResourceProperties.S3Prefix;
        await underTest.handler(obj, cfContext);

        expect(successFake.callCount).to.equal(0);
        expect(failFake.callCount).to.equal(1);
    });

    it('missing EventLambdaArn argument should send fail response ', async () => {
        //hard copy
        let obj = JSON.parse(JSON.stringify(cfCreateEvent));
        delete obj.ResourceProperties.EventLambdaArn;
        await underTest.handler(obj, cfContext);

        expect(successFake.callCount).to.equal(0);
        expect(failFake.callCount).to.equal(1);
    });

    it('create successful -> send success', async () => {

        console.log(cfCreateEvent.ResourceProperties.EventLambdaArn);
        let expectedArn = "this:is:an:arn";

        await underTest.handler(cfCreateEvent, cfContext);

        expect(successFake.callCount).to.equal(1);
        let [event, context, custom] = successFake.firstCall.args;
        expect(event).to.deep.equal(cfCreateEvent);
        expect(context).to.deep.equal(cfContext);
        expect(custom).include.all.keys('data');

        let data = custom.data;
        expect(data).include({
            'SubArn': expectedArn
        });

        expect(failFake.callCount).to.equal(0);

    });

    it('create failed (permission) -> send failed ', async () => {

    });

    it('create failed (unknown bucket) -> send failed ', async () => {

    });

    it('update successful -> send success', async () => {

    });

    it('update failed -> send failed', async () => {

    });

    it('delete successful -> send success', async () => {

    });

    it('delete failed (permission) -> send failed', async () => {

    });

});