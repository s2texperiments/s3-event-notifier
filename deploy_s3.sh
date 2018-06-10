#!/bin/bash

mkdir deploy
zip -r deploy/s3-event-notifier.zip index.js s3Api.js handler.js node_modules/
