const expect = require('chai').expect;
const spy = require('sinon').spy;
const fake = require('sinon').fake;

const proxyquire = require('proxyquire').noCallThru();

const fs = require('fs');
const cfEvent = JSON.parse(fs.readFileSync('test/cfCreateEventData.json', 'utf8'));
const cfContext = JSON.parse(fs.readFileSync('test/cfContextData.json', 'utf8'));


describe('s3-event-notifier', () => {

    it('create successful -> send success', async () => {

        // let underTest = proxyquire('../index.js', {
        //     'node-fetch': nodeFetchFake
        // });
        //
        // await underTest.sendSuccess(cfEvent, cfContext);
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