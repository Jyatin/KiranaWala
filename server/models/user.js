const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ["customer", "store-owner", "admin"],
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
});

async function hashPassword(password) {
  if (/^\$2[aby]\$\d{2}\$/.test(password)) {
    return password;
  }

  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  this.password = await hashPassword(this.password);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", userSchema);

User.hashPassword = hashPassword;

module.exports = User;
