#!/bin/bash

mkdir deploy
zip -r deploy/s3-event-notifier.zip index.js node_modules/
