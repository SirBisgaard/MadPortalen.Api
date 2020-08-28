/*
 * Mongoose ingredients schema
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

exports.followSchema = new Schema({
    // The user that is following the other user.
    follower: { type: Schema.ObjectId, ref: 'user' }, 
    // The user that is being followed.
    followed: { type: Schema.ObjectId, ref: 'user' },
});
