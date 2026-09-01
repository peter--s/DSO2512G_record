

            // Recording: honour a one-shot duration override. drawMessage() resets the
            // countdown when it first sees a new message, so setting it in showMessage()
            // would be overwritten here. Consuming the override leaves every other caller
            // on the app's own default.
            if (appParam_messageFrames > 0) {
                appParam_messageCountdown = appParam_messageFrames;
                appParam_messageFrames = 0;
            }
