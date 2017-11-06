app.controller('settingsBotController', ['botSettingsService',
function (botSettingsService) {
    var self = this;
    self.isLoading = true;

    botSettingsService.get().then(function success(botSettings) {
        self.botSettings = botSettings;
        self.isLoading = false;
    });

    self.removeUser = function (user) {
        var index = self.botSettings.users.indexOf(user);
        if (index > -1) {
            self.botSettings.users.splice(index, 1);
        }
    };

    self.addUser = function () {
        var userName = self.newUserName;
        self.newUserName = null;
        self.botSettings.users.push({ name: userName, isEnabled: true, isAdmin: false });
    }

    self.apply = function () {
        return botSettingsService.set(self.botSettings);
    }
}])