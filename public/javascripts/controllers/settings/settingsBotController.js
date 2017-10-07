app.controller('settingsBotController', [function () {
    var self = this;
    self.botSettings = { 
        token: "Hello",
        users: [
            { name: 'user1', isEnabled: true, isAdmin: true },
            { name: 'user2', isEnabled: false, isAdmin: false },
            { name: 'user3', isEnabled: false, isAdmin: true },
            { name: 'user4', isEnabled: true, isAdmin: false }
        ],
        notifications: [
            { id: 'printStart', title: 'Printing started', isEnabled: true, isForAdminsOnly: false },
            { id: 'printEnd', title: 'Printing ended', isEnabled: true, isForAdminsOnly: false },
            { id: 'unauthorizedBotAccess', title: 'Unauthorized bot access', isEnabled: false, isForAdminsOnly: true }
        ]
    };
}])