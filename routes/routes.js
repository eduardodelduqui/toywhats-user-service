const express = require('express')
const User = require('../model/User')
const { generateDerivedKeyScrypt, generateSalt } = require('../utils/utils')
const { authenticator } = require('otplib')
const qrcode = require('qrcode')
const router = express.Router()


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
            return res.status(409).send({ message: 'Phone conflict'})
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

router.delete('/users/:phone', async (req, res) => {
    try {
        await User.deleteOne({phone: req.params.phone})
        res.status(200).send('User deleted successfully')
    } catch {
        res.status(404).send({error: 'Not able to find user'})
    }
})

module.exports = router