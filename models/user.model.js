const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { roles } = require('../config/roles');

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    company: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      validate: {
        validator: function (value) {
          return !(!this.isOAuthUser && !value);
        },
        message: "Password is required",
      },
      trim: true,
    },
    role: {
      type: String,
      enum: roles,
      default: 'user',
    },
    isOAuthUser: { 
      type: Boolean, 
      default: false 
    },
    connectedAds: { 
      type: Boolean, 
      default: false 
    },
  },
  {
    timestamps: true,
  }
);

userSchema.statics.isEmailTaken = async function (email, excludeUserId) {
  const user = await this.findOne({ email, _id: { $ne: excludeUserId } });
  return !!user;
};

userSchema.methods.isPasswordMatch = async function (password) {
  const user = this;
  return bcrypt.compare(password, user.password);
};

userSchema.pre('save', async function (next) {
  const user = this;
  if (user.isModified('password')) {
    user.password = await bcrypt.hash(user.password, 8);
  }
  next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;