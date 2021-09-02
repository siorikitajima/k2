const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const blogSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    header: [{}],
    body: [{}],
    published: {
        type: Boolean,
        required: true
    },
    featimg: {
        type: String
    },
    title: {
        type: String
    },
    desc: {
        type: String
    }
}, { timestamps: true });

const Blog = mongoose.model('Blog', blogSchema);
module.exports = Blog;