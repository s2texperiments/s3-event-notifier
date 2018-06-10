#!/bin/bash

mkdir deploy
zip -r deploy/s3-event-notifier.zip index.js index_impl.js s3Api.js node_modules/
