/**
 * Created by chris on 09/05/16.
 */
var nodemailer = require('nodemailer');
var mailConfig = require('./../../configurationModule/module.js').data.restHost.mail;
var config = require('./../../configurationModule/module.js').data.restHost.mailUrl;
var transporter = nodemailer.createTransport(mailConfig);






// verify connection configuration
transporter.verify(function (error, success) {
    if (error) {
        console.log(error);
    }
    else {
        console.log('Server is ready to take messages');
    }
});

exports.sendEmail = function(userToken, userEmail, firstName) {
    transporter.sendMail({
        from: 'madportalendk@gmail.com',
        to: userEmail,
        subject: 'Nyt kodeord',
        text: 'Hej ' + firstName + '. Klik på linket for at ændre dit kodeord: ' +
        config.resetPassword + userToken
    }, function (err) {
        if (err) {
            console.log(err);
        } else {
            console.log('An email has been sent to ' + userEmail);
        }
        transporter.close();
    });

};

exports.sendConfirmationMail = function(userToken, userEmail, firstName) {
    transporter.sendMail({
        from: 'madportalendk@gmail.com',
        to: userEmail,
        subject: 'Velkommen til Madportalen',
        text: 'Hej ' + firstName + '\n\n'
        + 'Som ny bruger på Madportalen, kan du oprette opskrifter og madplaner.\n\n'
        + 'Før du kan komme igang med at bruge Madportalen, skal du godkende din email.\n'
        + 'klik på nedestående link for at godkende din oprettelse\n'
        + config.confirmationEmail + userToken
    }, function (err) {
        if (err) {
            console.log(err);
        } else {
            console.log('       - An email has been send');
        }
    });
    transporter.close();
};