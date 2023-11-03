const mongoose = require('mongoose')

const userSchema = mongoose.Schema({
  name: String,
  phone: String,
  password: String,
  salt: String,
  secret2fa: String,
  image: String,
  contacts: [
    {
      name: String,
      phone: String
    }
  ]
}, { collection: process.env.COLLECTION_NAME })

module.exports = mongoose.model('User', userSchema)
