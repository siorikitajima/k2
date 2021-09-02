const multer = require('multer');
const multerS3 = require('multer-s3');
const AWS = require('aws-sdk');
const Blog = require('../models/blog');
const fs = require('fs');

const s3 = new AWS.S3({
    accessKeyId: process.env.ACCESS_KEY_ID_S3,
    secretAccessKey: process.env.SECRET_ACCESS_KEY_S3
});

const editor_get = (req, res) => {
    let blogId = req.params.blogId;
    Blog.findOne({name: blogId}, (err, blogData) => {
        if(err) {console.log(err);}
        else {
            res.render('blog-editor', {
                title: '知恵袋',
                nav: 'blog-editor',
                name: blogId,
                post: blogData,
                published: blogData.published
            })
        }
    })
}

const editor_post = (req, res) => {
    var blogId = req.params.blogId;
    const data = req.body;
    const headLength = req.headers.headlength;
    const headerData = data.slice(0, headLength);
    const bodyData = data.slice(headLength);
    let urls = [], titles = [], subtitles = [], headers = [], paras = [];
    for(let b = 0; b < headerData.length; b++) {
        if(headerData[b].type == 'header' && headerData[b].data.level == 1) {
            let datext = headerData[b].data.text;
            titles.push(datext);
        }
        if(headerData[b].type == 'header' && headerData[b].data.level == 3) {
            let datext = headerData[b].data.text;
            subtitles.push(datext);
        }
    }
    for(let b = 0; b < bodyData.length; b++) {
        if(bodyData[b].type == 'image') {
            let daurl = bodyData[b].data.file.url;
            urls.push(daurl);
        }
        if(bodyData[b].type == 'header') {
            let datext = bodyData[b].data.text;
            headers.push(datext);
        }
        if(bodyData[b].type == 'paragraph') {
            let datext = bodyData[b].data.text;
            paras.push(datext);
        }
    }
    const descText = headers[0] + ' // ' + paras[0];
    var cleanedText = descText.replace( /(<([^>]+)>)/ig, '');
    var stripHere = 140;
    var shortText = cleanedText.substring(0, stripHere) + "..."; 

    Blog.findOne({name: blogId}, (err, blogData) => {
        blogData.header = headerData;
        blogData.body = bodyData;
        blogData.featimg = urls[0];
        blogData.title = titles[0];
        blogData.subtitle = subtitles[0];
        blogData.desc = shortText;

        blogData.save((err) => {
            if(err) { console.error(err); 
            } else {
                res.send('success'); 
            }
        });
    })
}

const blogimg_post = (req, res) => {
    let filename;
    let upload = multer({
        limits: { fileSize: 5000000 },
        storage: multerS3({
          s3: s3,
          bucket: 'k2-blog',
          acl: "public-read",
          metadata: function (req, file, cb) {
            cb(null, {fieldName: file.fieldname});
          },
          key: function (req, file, cb) {
            filename = `blog/${file.originalname}`
            cb(null, `blog/${file.originalname}`);
          }
        })
      });
      const uploadMiddleware = upload.single('image');
      uploadMiddleware(req, res, function(err) {
        if (err) {
          console.log(err);
          return res.send("<script> alert('Oops! There was errors'); window.location =  '/'; </script>");
         }
        else {
          return res.send({
            success: 1,
            file: {
              url: `https://k2-blog.s3.us-west-1.amazonaws.com/${filename}`,
            } 
        })}
      });
}

const publish_post = (req, res) => {
    var blogId = req.params.blogId;
    const data = req.body;
    let status;
    if(data.published == 'true') {
        status = false;
     } else if(data.published == 'false') {
        status = true;
     }
    Blog.findOne({name: blogId}, (err, blogData) => {
        blogData.published = status;
        blogData.save((err) => {
            if(err) { console.error(err); 
            } else {
                res.send('success');
            }
        });
    })
}

const blogList_get = (req, res) => {
    Blog.find({}, (err, featsData) => {
        featsData.sort(function(a, b) {
            var keyA = new Date(a.updatedAt),
              keyB = new Date(b.updatedAt);
            if (keyA < keyB) return 1;
            if (keyA > keyB) return -1;
            return 0;
          });
        if(err) {console.log(err);}
        else {
            res.render('blogList', {
                title: '編集部',
                nav: 'blogList',
                posts: featsData
            })
        }
    })
}

const blogList_post = (req, res) => {
    let hdata = fs.readFileSync('./json/blogHeader.json');
    let headData = JSON.parse(hdata);
    let bdata = fs.readFileSync('./json/blogBody.json');
    let bodyData = JSON.parse(bdata);
    const newName = req.body.blogname;
    Blog.countDocuments({name: newName}, (err, count) => { 
        if(count > 0){
            res.send('<script>alert("This name already exist.")</script>');
        } else {
            const withName = new Blog({
                name: newName,
                header: headData,
                body: bodyData,
                published: false,
                title: '記事のタイトル'
            });
            withName.save((err) => {
                if(err) { console.error(err); 
                } else {
                  res.redirect('/edit/' + newName);
                }
            });
        }
    }); 
}

const blogList_delete = (req, res) => {
    const theName = req.body.oldname;
    Blog.findOneAndDelete({name: theName}, (err)=> {
        if(err) { console.error(err); 
        } else {
            res.redirect('blogList');
        }
    })
}

const blogList_rename = (req, res) => {
    const oldName = req.body.oldname;
    const newName = req.body.newname;
    Blog.findOne({name: oldName}, (err, blogData) => {
        blogData.name = newName;
        blogData.save((err) => {
            if(err) { console.error(err); }
            else { res.redirect('/blogList'); }
        });
    })
}

const info_get = (req, res) => {
    Blog.find({}, (err, blogsData) => {
        blogsData.sort(function(a, b) {
            var keyA = new Date(a.updatedAt),
              keyB = new Date(b.updatedAt);
            if (keyA < keyB) return 1;
            if (keyA > keyB) return -1;
            return 0;
          });
        if(err) {console.log(err);}
        else {
            res.render('info', {
                title: '知恵袋',
                nav: 'info',
                posts: blogsData
            })
        }
    })
}

const info_single_get = (req, res) => {
    var blogId = req.params.blogId;
    Blog.findOne({name: blogId}, (err, blogData) => {
        if(err) {console.log(err);}
        else {
            res.render('blog-single', {
                title: blogData.title,
                nav: 'blog-single',
                name: blogId,
                post: blogData
            })
        }
    })
}

module.exports = {
    editor_get,
    editor_post,
    blogimg_post,
    publish_post,
    blogList_get,
    blogList_post,
    blogList_delete,
    blogList_rename,
    info_get,
    info_single_get
}