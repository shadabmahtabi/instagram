var express = require("express");
var router = express.Router();

const userModel = require("./users");
const postModel = require("./post");
const passport = require("passport");
const localStrategy = require("passport-local");

const crypto = require("crypto");
const nodemailer = require("nodemailer");
const async = require('async');




const upload = require("./multer");

passport.use(new localStrategy(userModel.authenticate()));

router.get("/", function (req, res) {
  res.render("index", { footer: false });
});

//passport

router.post("/register", function (req, res) {
  var userdata = new userModel({
    username: req.body.username,
    name: req.body.name,
    email: req.body.email,
  });
  userModel.register(userdata, req.body.password)
    .then(function (registereduser) {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/profile/");
      });
    });
});


router.get("/login", function (req, res) {
  const errorMessage = req.flash("error")[0];
  res.render("login", { footer: false , errorMessage});
});

router.post("/login",
  passport.authenticate("local", {
    successRedirect: "/profile/",
    failureRedirect: "/login",
    failureFlash: true, // Enable flash messages for failed login
  }),
  function (req, res) {}
);

router.get("/logout", function (req, res, next) {
  req.logout(function (err) {
    if (err) return next(err);
    res.redirect("/");
  });
});

router.get("/profile", isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user }).populate("posts");
  

  res.render("profile", { footer: true, user });
});


// router.get("/profile", isLoggedIn, async function (req, res) {
//   const user = await userModel
//     .findOne({ username: req.session.passport.user })
//     .populate("posts");

//   res.render("profile", { footer: true, user });
// });



router.get("/feed", isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user })
  const posts = await postModel.find().populate("user");

  const requestedUsername = req.params.username;
  const userProfile = await userModel.findOne({ username: requestedUsername });

   // Find posts liked by the user
  //  const likedPosts = await postModel.find({ likes: user._id }).populate('likes');
  // console.log("liked people" , likedPosts);
  res.render("feed", { footer: true, posts ,user ,userProfile });
});

router.get("/mypost", isLoggedIn, async function (req, res) {
  try {
    const user = await userModel.findOne({ username: req.session.passport.user }).populate("posts");
    const userProfile = user; // Use the logged-in user as userProfile
    const posts = user.posts; // Use the logged-in user's posts

    res.render("mypost", { footer: true, user, posts, userProfile });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});



router.get("/edit", isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  res.render("edit", { footer: true, user });
});

router.post( "/upload", isLoggedIn,
  upload.single("image"),
  async function (req, res) {
    const user = await userModel.findOne({
      username: req.session.passport.user,
    });

    const postData = await postModel.create({
      picture: req.file.filename,
      caption: req.body.caption,
      user: user._id,
    });
    user.posts.push(postData._id);
    await user.save();
    res.redirect("/feed");
  }
);

router.get("/upload", isLoggedIn,async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user })

  res.render("upload", { footer: true , user});
});


router.post("/update", upload.single("image"), async function (req, res) {
  const user = await userModel.findOneAndUpdate(
    { username: req.session.passport.user },
    { username: req.body.username, name: req.body.name, bio: req.body.bio },
    { new: true }
  ); //find the login banda

  if (req.file) {
    user.profileImage = req.file.filename;
  }
  await user.save();
  res.redirect("/profile/");
});



router.get("/message", isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user })
  const users = await userModel.find({});

 

  const requestedUsername = req.params.username;
  // Fetch user data based on the requestedUsername
  const userProfile = await userModel.findOne({ username: requestedUsername });
   // Fetch posts of the user
  //  const userPosts = await postModel.find({ user: userProfile._id });

  // console.log(users)
  res.render("message", { footer: true, users , user ,userProfile ,});
});

router.get("/followers",async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user }).populate("followers")
  const users = await userModel.find({});


  res.render("followers", { footer: true , user ,users });
});


router.get("/following",async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user }).populate("following")
  const users = await userModel.find({});


  res.render("following", { footer: true , user ,users});
});


router.get("/notification", isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user });

  // Find posts liked by the user
  const likedPosts = await postModel.find({ likes: user._id }).populate('likes');

  

  // Extract unique user IDs who liked the posts
  const likedUserIds = likedPosts.reduce((ids, post) => {
    post.likes.forEach(like => {
      if (!ids.includes(like._id)) {
        ids.push(like._id);
      }
    });
    return ids;
  }, []);

  // Find users who liked the posts
  const likedUsers = await userModel.find({ _id: { $in: likedUserIds } });

  // console.log("Liked users:", likedUsers);
  // console.log("Liked posts:", likedPosts);

  res.render("notification", { footer: true, users: likedUsers, user, likedPosts  });
});



router.get("/search", isLoggedIn,async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user })

  res.render("search", { footer: true ,user});
});


//Other User profile route
router.get("/userprofile/:username", isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user })

  const requestedUsername = req.params.username;
  // Fetch user data based on the requestedUsername
  const userProfile = await userModel.findOne({ username: requestedUsername });
   // Fetch posts of the user
   const userPosts = await postModel.find({ user: userProfile._id });
  // Render the profile page with the userProfile data
  res.render("userprofile", { footer: true, userProfile , user , userPosts});
});



router.get("/like/post/:id", isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  const post = await postModel.findOne({ _id: req.params.id }).populate('likes');

//   // If already liked, remove like; if not liked, like it
  if (post.likes.map(like => like._id).indexOf(user._id) === -1) {
    post.likes.push(user._id);
  } else {
    post.likes = post.likes.filter(like => like._id.toString() !== user._id.toString());
  }

  await post.save();

  res.redirect("/feed");
});

router.get("/username/:username", isLoggedIn, async function (req, res) {
  const regex = new RegExp(`^${req.params.username}`, "i");
  const users = await userModel.find({ username: regex });
  res.json(users)
});

router.post("/follow/:username", isLoggedIn, async function (req, res) {
  try {
    const user = await userModel.findOne({ username: req.session.passport.user });
    const userProfile = await userModel.findOne({ username: req.params.username });
    const userPosts = await postModel.find({ user: userProfile._id });

    // Check if the current user is already following the target user
    if (!user.following.includes(userProfile._id)) {
      user.following.push(userProfile._id);
      await user.save();

      // Check if the target user is already in the followers list
      if (!userProfile.followers.includes(user._id)) {
        userProfile.followers.push(user._id);
        await userProfile.save();
      }
    }

    // Pass the user variable to the template
    res.render("userprofile", { footer: true, userProfile, user, userPosts });
  } catch (error) {
    // Handle errors appropriately
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});



// Route for unfollowing a user
router.post("/unfollow/:username", isLoggedIn, async function (req, res) {
  try {
    const user = await userModel.findOne({ username: req.session.passport.user });
    const requestedUsername = req.params.username;
    const userProfile = await userModel.findOne({ username: requestedUsername });
    const userPosts = await postModel.find({ user: userProfile._id });

    // Check if the current user is following the target user
    if (user.following.includes(userProfile._id)) {
      // Remove the target user from the following list
      user.following = user.following.filter(userId => userId.toString() !== userProfile._id.toString());
      await user.save();
    }

    // Pass the user variable to the template
    res.render("userprofile", { footer: true, userProfile, user, userPosts });
  } catch (error) {
    // Handle errors appropriately
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// Assuming you have the necessary imports and dependencies

// Delete post route
router.post("/deletepost/:postId", isLoggedIn, async function (req, res) {
  try {
    const user = await userModel.findOne({ username: req.session.passport.user });
    const postId = req.params.postId;

    // Find the post by postId
    const post = await postModel.findById(postId);

    // Check if the post exists
    if (!post) {
      return res.status(404).send("Post not found");
    }

    // Check if the post belongs to the logged-in user
    if (post.user.toString() !== user._id.toString()) {
      return res.status(403).send("Unauthorized");
    }

    // Remove the post from the user's posts array
    const index = user.posts.indexOf(postId);
    if (index > -1) {
      user.posts.splice(index, 1);
    }

    // Remove the post document
    await postModel.findByIdAndDelete(postId);

    // Save the updated user
    await user.save();

    res.redirect("/mypost"); // Redirect to the user's posts page
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});




//Forget Password

// router.get("/forgot", function (req, res) {
//   res.render("forgot", { footer: false });
// });

// router.post("/forgot", async function (req, res, next) {
//   try {
//     const token = await new Promise((resolve, reject) => {
//       crypto.randomBytes(20, (err, buf) => {
//         if (err) {
//           reject(err);
//         } else {
//           resolve(buf.toString("hex"));
//         }
//       });
//     });

//     const user = await userModel.findOne({
//       email: req.body.email,
//     });

//     if (!user) {
//       req.flash("error", "No account with that email address exists.");
//       return res.redirect("/forgot");
//     }

//     user.resetPasswordToken = token;
//     user.resetPasswordExpires = Date.now() + 60 * 60 * 1000;

//     await user.save();

//     const transporter = nodemailer.createTransport({
//       // Configure your nodemailer transporter (SMTP, Gmail, etc.)
//       service: "gmail",
//       host: 'smtp.example.com',
//       port: 465,
//       secure: true,
//       logger : true,
//       secureConnection : false,
//       auth: {
//         user: 'shaazakhtar12@gmail.com',
//         pass: 'gmailPassword@123',
//       },
//       tls:{
//         rejectUnauthorized : true,
//       }
//     });

//     const mailOptions = {
//       to: user.email,
//       from: "asadakhtar800@gmail.com",
//       subject: "Password Reset",
//       text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n
//         Please click on the following link, or paste this into your browser to complete the process:\n\n
//         ${req.protocol}://${req.get("host")}/reset/${token}\n\n
//         If you did not request this, please ignore this email, and your password will remain unchanged.\n`,
//     };

//     await transporter.sendMail(mailOptions);

//     req.flash("info", `An e-mail has been sent to ${user.email} with further instructions.`);
//     res.redirect("/forgot");
//   } catch (error) {
//     console.error(error);
//     // Handle the error appropriately, possibly redirecting to an error page
//     res.status(500).send("Internal Server Error");
//   }
// });




// router.get("/reset/:token",async function (req, res) {
//   try {
//     const user = await userModel.findOne({
//       resetPasswordToken: req.params.token,
//       resetPasswordExpires: { $gt: Date.now() },
//     });
  
//     if (!user) {
//       req.flash("error", "Password reset token is invalid or has expired.");
//       return res.redirect("/forgot");
//     }
  
//     res.render("reset", { token: req.params.token, footer: false });
//   } catch (error) {
//     console.error(error);
//     // Handle the error appropriately, possibly redirecting to an error page
//     res.status(500).send("Internal Server Error");
//   }
// });




// router.post("/reset/:token", async function (req, res) {
//   try {
//     const user = await userModel.findOne({
//       resetPasswordToken: req.params.token,
//       resetPasswordExpires: { $gt: Date.now() },
//     });

//     if (!user) {
//       req.flash("error", "Password reset token is invalid or has expired.");
//       return res.redirect("/forgot");
//     }

//     user.setPassword(req.body.password, function () {
//       user.resetPasswordToken = undefined;
//       user.resetPasswordExpires = undefined;

//       user.save(function (err) {
//         if (err) {
//           console.error(err);
//           // Handle the error appropriately, possibly redirecting to an error page
//           res.status(500).send("Internal Server Error");
//         }

//         req.logIn(user, function (err) {
//           if (err) {
//             console.error(err);
//             // Handle the error appropriately, possibly redirecting to an error page
//             res.status(500).send("Internal Server Error");
//           }

//           const transporter = nodemailer.createTransport({
//             // Configure your nodemailer transporter (SMTP, Gmail, etc.)
//           });

//           const mailOptions = {
//             to: user.email,
//             from: "shaazakhtar12@gmail.com",
//             subject: "Your password has been changed",
//             text: `Hello,\n\n
//               This is a confirmation that the password for your account ${user.email} has just been changed.\n`,
//           };

//           transporter.sendMail(mailOptions, function (err) {
//             if (err) {
//               console.error(err);
//               // Handle the error appropriately, possibly redirecting to an error page
//               res.status(500).send("Internal Server Error");
//             }

//             req.flash("success", "Success! Your password has been changed.");
//             res.redirect("/");
//           });
//         });
//       });
//     });
//   } catch (error) {
//     console.error(error);
//     // Handle the error appropriately, possibly redirecting to an error page
//     res.status(500).send("Internal Server Error");
//   }
// });













function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/");
}

module.exports = router;
