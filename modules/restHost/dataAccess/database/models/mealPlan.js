
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

exports.mealPlanSchema = new Schema({
    title: String,
    description: String,
    days: [{
        nameOfDay: String,
        recipes: [{ type: Schema.ObjectId, ref: 'recipe' }]
    }],
    createdBy: { type: Schema.ObjectId, ref: 'user' },
    createdTime: Date
});
