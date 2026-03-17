const fs = require('fs');
const path = require('path');

const login = require('../index');

const appState = fs.readFileSync(path.join(__dirname, 'appState.json'), 'utf-8');

login({ appState: JSON.parse(appState) }, (err, api) => {
    if (err) {
        console.error(err);
        return;
    }

    // Get profile info for the current profile and any additional profiles.
    api.getProfiles((err, data) => {
        if (err) {
            console.error(err);
            return;
        }
        console.log("profiles", data);
    });
});