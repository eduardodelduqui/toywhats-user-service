const express = require('express')
const User = require('../model/User')
const { generateDerivedKeyScrypt, generateSalt } = require('../utils/utils')
const { authenticator } = require('otplib')
const qrcode = require('qrcode')
const router = express.Router()

router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}, '-password -salt -secret2fa -__v -_id')

    return res.status(200).send(users)
  } catch (error) {
    res.status(400).send(error)
  }
})

router.get('/users/:phone', async (req, res) => {
  const phone = req.params.phone
  try {
    const users = await User.findOne({ phone }, '-password -salt -secret2fa -__v -_id')

    return res.status(200).send(users)
  } catch (error) {
    res.status(400).send(error)
  }
})


router.post('/users/:phone/contacts', async (req, res) => {
  const phone = req.params.phone
  const contactName = req.body.name
  const contactPhone = req.body.phone
  try {
    const users = await User.findOne({ phone: contactPhone }, '-password -salt -secret2fa -__v -_id')

    if (!users) {
      return res.status(404).send({ message: 'User not found' })
    }


    User.updateOne(
      { phone },
      {
        $push:
        {
          contacts:
          {
            name: contactName,
            phone: contactPhone
          }
        }
      })
      .then(() => {
        return res.status(200).send(users)
      })
      .catch(err => {
        return res.status(400).send(err)
      })

  } catch (error) {
    res.status(400).send(error)
  }
})

router.post('/users', async (req, res) => {
  const { name, phone, password } = req.body

  if (!name.trim() || !phone.trim() || !password.trim()) {
    return res.status(400).send({ message: 'Error to create account' })
  }
  const user = new User({
    name: req.body.name,
    phone: req.body.phone,
    password: req.body.password,
    salt: generateSalt(16),
  })

  try {
    const registeredUser = await User.findOne({ phone })

    if (registeredUser) {
      return res.status(409).send({ message: 'Phone conflict' })
    }

    const derivedKey = await generateDerivedKeyScrypt(password, user.salt)
    user.password = derivedKey

    const secret = authenticator.generateSecret()
    const otpauthURL = authenticator.keyuri(user.name, 'toy-whats', secret);

    qrcode.toDataURL(otpauthURL, async (err, dataUrl) => {
      if (err) {
        console.error(err);
        return;
      }

      user.secret2fa = secret
      await user.save()
      return res.status(200).send({ dataUrl })
    });

  } catch (error) {
    console.log(error)
    return res.status(500).send({ message: 'Error to create account' })
  }
})

router.put('/users/:phone', async (req, res) => {
  const { name, image } = req.body;
  const phone = req.params.phone;

  try {
    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    if (name) {
      user.name = name;
    }

    if (image) {
      user.image = image;
    }

    await user.save();
    return res.status(200).send({ user });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: 'Error to update user' });
  }
});

module.exports = router;

router.delete('/users/:phone', async (req, res) => {
  try {
    await User.deleteOne({ phone: req.params.phone })
    res.status(200).send('User deleted successfully')
  } catch {
    res.status(404).send({ error: 'Not able to find user' })
  }
})

module.exports = router