/*
 * Mongoose ingredients schema
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

exports.ingredientSchema = new Schema({
    name: String,
    unitType: String,
    createdTime: Date
});
