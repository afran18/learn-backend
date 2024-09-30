const crypto = require('crypto');

const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const sendGridTransport = require('nodemailer-sendgrid-transport');
require('dotenv').config();
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SEND_GRID_API_KEY);

const User = require('../models/user');

console.log("API: ", process.env.SEND_GRID_API_KEY);


const transporter = nodemailer.createTransport(sendGridTransport({
  auth: {
    api_key : process.env.SEND_GRID_API_KEY
  }
}));

exports.getLogin = (req, res, next) => {
  let message = req.flash('error');
  if(message.length > 0) {
    message =  message[0];
  } else {
    message = null
  }
  res.render('auth/login', {
    path: '/login',
    pageTitle: 'Login',
    errorMessage: message
  });
};

exports.getSignup = (req, res, next) => {
  let message = req.flash('error');
  if(message.length > 0) {
    message =  message[0];
  } else {
    message = null
  }
  res.render('auth/signup', {
    path: '/signup',
    pageTitle: 'Signup',
    errorMessage : message
  });
};

exports.postLogin = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  User.findOne({email:email})
    .then(user => {
      if(!user) {
        req.flash('error', "Invalid email or password.");
        return res.redirect('/login');
      }
      bcrypt
        .compare(password, user.password)
        .then(doMatch => {
          if(doMatch) {
            req.session.isLoggedIn = true;
            req.session.user = user;
            return req.session.save(err => {
              console.log(err);
              res.redirect('/');
          });
          }
          req.flash('error', "Invalid email or password.");
          res.redirect('/login');
        })
        .catch(err => {
        res.redirect('/login')
      });
    })
    .catch(err => console.log(err));
};

exports.postSignup = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;
  User
  .findOne({email: email})
  .then(userDoc => {
    if(userDoc) {
      req.flash('error', "Email already exists.");
      return res.redirect('/signup');
    }

    return bcrypt
      .hash(password, 12)
      .then(hashedPassword => {
        const user = new User({
          email: email,
          password : hashedPassword,
          cart: {items: []}
        });
        return user.save();
      })
  })
  .then(result => {
    res.redirect('/login');
    console.log("Email sent");
    
    return transporter.sendMail({
      to: email,
      from: 'afran.vk18@outlook.com',
      subject: "Signup succeeded",
      html: '<h1>User successfully signed up</h1>'
    });
  })
  .catch( err => {
    console.log(err);    
  });
};

// exports.postSignup = (req, res, next) => {
//   const email = req.body.email;
//   const password = req.body.password;

//   User.findOne({ email: email })
//     .then(userDoc => {
//       if (userDoc) {
//         req.flash('error', 'Email already exists.');
//         return res.redirect('/signup');
//       }
//       return bcrypt.hash(password, 12);
//     })
//     .then(hashedPassword => {
//       const user = new User({
//         email: email,
//         password: hashedPassword,
//         cart: { items: [] }
//       });
//       return user.save();
//     })
//     .then(result => {
//       res.redirect('/login');
//       console.log('User signed up, sending email...');
      
//       const msg = {
//         to: email,
//         from: 'shop@node-complete.com',
//         subject: 'Signup succeeded',
//         html: '<h1>User successfully signed up!</h1>',
//       };

//       return sgMail.send(msg);
//     })
//     .then(() => {
//       console.log('Email sent successfully!');
//     })
//     .catch(err => {
//       console.log('Error sending email:', err);
//     });
// };

exports.postLogout = (req, res, next) => {
  req.session.destroy(err => {
    console.log(err);
    res.redirect('/');
  });
};

exports.getReset = (req, res, next) => {
  let message = req.flash('error');
  if(message.length > 0) {
    message =  message[0];
  } else {
    message = null
  }
  res.render('auth/reset', {
    path: '/reset',
    pageTitle: 'Reset Password',
    errorMessage: message
  });
}

exports.postReset = (req, res, next) => {
  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      console.log(err);
      return res.redirect('/reset');
    }
    const token = buffer.toString('hex');
    User.findOne({ email: req.body.email })
      .then(user => {
        if (!user) {
          req.flash('error', 'No account with that email found.');
          return res.redirect('/reset');
        }
        user.resetToken = token;
        user.resetTokenExpiration = Date.now() + 3600000; // 1 hour expiration
        console.log('Generated Token:', token); // Log the generated token
        console.log('Token Expiration Time:', user.resetTokenExpiration);
        return user.save();
      })
      .then(result => {
        res.redirect('/');
        return transporter.sendMail({
          to: req.body.email,
          from: 'afran.vk18@outlook.com',
          subject: 'Password Reset',
          html: `
            <p>You requested a password reset</p>
            <p>Click this <a href="http://localhost:3000/reset/${token}">link</a> to reset your password.</p>
            ${token}
          `
        });
      })
      .catch(err => {
        console.log(err);
      });
  });
};


exports.getNewPassword = (req, res, next) => {
  const token = req.params.token;
  console.log('Token from URL:', token); // Log the token from the URL
  User.findOne({ resetToken: token, resetTokenExpiration: { $gt: Date.now() } })
    .then(user => {
      if (!user) {
        console.log('No user found for token:', token); // Log if no user found
        req.flash('error', 'Token is invalid or has expired.');
        return res.redirect('/reset');
      }
      let message = req.flash('error');
      if (message.length > 0) {
        message = message[0];
      } else {
        message = null;
      }
      res.render('auth/new-password', {
        path: '/new-password',
        pageTitle: 'New Password',
        errorMessage: message,
        userId: user._id.toString(),
        passwordToken: token // Pass the token to the form for the next step
      });
    })
    .catch(err => {
      console.log(err);
    });
};


exports.postNewPassword = (req, res, next) => {
  const newPassword = req.body.password;
  const userId = req.body.userId;
  const passwordToken = req.body.passwordToken;
  let resetUser;

  User.findOne({
    resetToken: passwordToken,
    resetTokenExpiration: {$gt: Date.now()},
    _id: userId  
  })
  .then(user => {
    resetUser = user;
    return bcrypt.hash(newPassword, 12)
  })
  .then(hashedPassword => {
    resetUser.password = hashedPassword;
    resetUser.resetToken = undefined;
    resetUser.resetTokenExpiration = undefined;
    return resetUser.save();
  })
  .then(result => {
    res.redirect('/login');
  })
  .catch(err => {
    console.log(err);    
  })
}