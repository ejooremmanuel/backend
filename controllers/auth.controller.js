const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
var bcrypt = require("bcryptjs");
const prisma = new PrismaClient();
const fetchP = import('node-fetch').then(mod => mod.default)
const fetch = (...args) => fetchP.then(fn => fn(...args))
const nodemailer = require('nodemailer');
const smtpTransport = require('nodemailer-smtp-transport');

module.exports.signup = async (req, res) => {
  try {
    var error = [];

    if (!req.body.name) {
      error.push("name");
    };
    if (!req.body.email) {
      error.push("email");
    };
    if (!req.body.password) {
      error.push("password");
    };
    if (!req.body.birthday) {
      error.push("birthday");
    };
    if (!req.body.gender) {
      error.push("gender");
    };
    if (!(error.length === 0)) {
      return res.status(400).json({
        ok: false,
        error: "Please input: " + error
      });
    };
    const email = await prisma.account.findUnique({
      where: { email: req.body.email }
    });
    if (email) {
      res.status(400).json({
        ok: false,
        error: "Email exist!"
      });
    } else {
      var salt = bcrypt.genSaltSync(10);
      var hashPass = bcrypt.hashSync(req.body.password, salt);
      var hashMail = bcrypt.hashSync(req.body.email, salt);
      const tokenVerify = jwt.sign({ email: req.body.email }, process.env.secretOrKey, {
        expiresIn: 7200,
      });
      const account = await prisma.account.create({
        data: {
          name: req.body.name,
          email: req.body.email,
          password: hashPass,
          gender: req.body.gender,
          birthday: req.body.birthday,
          tokenVerify: hashMail
        },
      });

      // config mail server
      const transporter = nodemailer.createTransport(smtpTransport({
        host: 'mail.geniusparkle.com',
        secureConnection: false,
        tls: {
          rejectUnauthorized: false
        },
        port: 465,
        auth: {
          user: process.env.EMAIL_USERNAME,
          pass: process.env.EMAIL_PASSWORD,
        }
      }));

      var urlVerify = "http://localhost:8080/api/mail/verify?token=" + tokenVerify;

      var content = '';
      content += `Hi ` + account.name + `,<br>
      Welcome to GeniuSparkle! Click on the link below to verify your account:<br>
      <a href="`+ urlVerify + `">` + urlVerify + `</a>
      `;

      var mainOptions = {
        from: process.env.EMAIL_USERNAME,
        to: req.body.email,
        subject: 'Account verification',
        text: '',
        html: content
      };
      const sendMail = await transporter.sendMail(mainOptions);

      return res.json({ ok: true, message: "Signup successfully!" });
    }
  }
  catch (error) {
    console.log(error)
    res.status(500).json({
      ok: false,
      error: "Something went wrong!"
    });

  }
  finally {
    async () =>
      await prisma.$disconnect()
  }
}

module.exports.loginDiscord = async (req, res) => {
  try {
    var error = [];

    if (!req.body.access_token) {
      error.push("access_token");
    };

    if (!(error.length === 0)) {
      return res.status(400).json({
        ok: false,
        error: "Please input: " + error
      });
    };

    //check token discord
    var tokenDiscord = "Bearer " + req.body.access_token;
    const response2 = await fetch(`http://discordapp.com/api/users/@me`,
      {
        method: 'GET',
        headers: {
          Authorization: tokenDiscord,
        },
      });

    const json = await response2.json();

    console.log(json)

    if (json.email) {
      // check email exist
      const email = await prisma.account.findUnique({
        where: { email: json.email }
      });
      if (!email) {
        var salt = bcrypt.genSaltSync(10);
        var hash = bcrypt.hashSync(process.env.commomPass, salt);
        const account = await prisma.account.create({
          data: {
            name: json.username,
            email: json.email,
            password: hash,
            otherData: "discordId: " + json.id,
            verify: true
          },
        });
      }
      const token = jwt.sign({ id: json.email }, process.env.secretOrKey, {
        expiresIn: 86400,
      });
      return res.status(200).json({
        ok: "true",
        data: { token: "Bearer " + token }
      });
    } else {
      res.status(400).json({
        ok: false,
        error: "Access_token was wrong"
      });
    }
  }
  catch (error) {
    console.log(error)
    res.status(500).json({
      ok: false,
      error: "Something went wrong!"
    });

  }
  finally {
    async () =>
      await prisma.$disconnect()
  }
}

module.exports.login = async (req, res) => {
  try {
    var error = [];

    if (!req.body.email) {
      error.push("email");
    };
    if (!req.body.password) {
      error.push("password");
    };
    if (!(error.length === 0)) {
      res.status(400).json({
        ok: false,
        error: "Please input: " + error
      });
    };
    const email = await prisma.account.findUnique({
      where: {
        email: req.body.email
      }
    });
    if (email) {
      var isRightPass = bcrypt.compareSync(req.body.password, email.password);
      if (isRightPass) {
        // check verify
        if (!email.verify) {
          return res.status(400).json({ 
            ok: false,
            verify: false,
            message: "The account is not verify yet!" 
          });
        };

        // create and assign a token
        const token = jwt.sign({ id: email.email }, process.env.secretOrKey, {
          expiresIn: 86400,
        });
        res.setHeader("Authentication", token);
        res.status(200).json({
          ok: "true",
          data: { token: "Bearer " + token }
        });
      } else {
        res.status(400).json({ ok: false, message: "Wrong password!" })
      }
    } else {
      res.status(400).json({ ok: false, message: "Wrong email!" });
    }
  }
  catch (error) {
    res.status(500).json({
      ok: false,
      error: "Something went wrong!"
    });

  }
  finally {
    async () =>
      await prisma.$disconnect()
  }
}
