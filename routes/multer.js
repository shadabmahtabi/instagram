const multer = require('multer')

const {v4 : uuidv4} = require("uuid");
//inbuilt function of node 
const path = require("path");

//it will give extension 
// console.log(path.extname("hello.pdf"))

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/images/uploads')
  },
  filename: function (req, file, cb) {
    const uniquename = uuidv4();
    cb(null, uniquename + path.extname(file.originalname))
  }
})

const upload = multer({ storage: storage })
module.exports = upload;