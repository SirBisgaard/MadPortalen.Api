/*
 * Mongoose user schema
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

exports.userSchema = new Schema({
    email: String,
    pictureLocation: String,
    password: String,
    firstName: String,
    lastName: String,
    authorName: String,
    description: String,
    cookbook: {
        recipes: [{type: Schema.ObjectId, ref: 'recipe'}],
        mealPlans: [{type: Schema.ObjectId, ref: 'mealPlan'}]
    },
    createdTime: Date,
    emailIsActivated: Boolean
});