/*
 * Recipe API module.
 */
var config = require('./../../../configurationModule/module.js').data.restHost.mongodb;

var ObjectID = require('mongodb').ObjectID;
var mongoose = require('mongoose');
var recipeSchema = require('./models/recipe.js').recipeSchema;
var userSchema = require('./models/user.js').userSchema;
var ingredientSchema = require('./models/ingredient.js').ingredientSchema;
var mealPlanSchema = require('./models/mealPlan.js').mealPlanSchema;
var followSchema = require('./models/follow.js').followSchema;

exports.Ingredient = mongoose.model('ingredient', ingredientSchema);
exports.Recipe = mongoose.model('recipe', recipeSchema);
exports.User = mongoose.model('user', userSchema);
exports.MealPlan = mongoose.model('mealPlan', mealPlanSchema);
exports.Follow = mongoose.model('follow', followSchema);
exports.ObjectID = ObjectID;


exports.connect = function () {
    if (mongoose.connection.readyState == 0) {
        mongoose.connect(config.connection);
    }
};