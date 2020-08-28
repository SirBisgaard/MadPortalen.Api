/*
 * Mongoose recipe schema
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

exports.recipeSchema = new Schema({
    name: String,
    pictureLocation: String,
    shortDescription: String,
    longDescription: String,
    serves: Number,
    dishType: String,
    difficulty: String,
    ingredients: [{
            ingredient: { type: Schema.ObjectId, ref: 'ingredient' , required: true},
            amount: Number
        }],
    ratings: [{
            rating: Number,
            createdBy: { type: Schema.ObjectId, ref: 'user', required: true },
            createdTime: String
        }],
    createdBy: { type: Schema.ObjectId, ref: 'user', required: true },
    createdTime: Date
});