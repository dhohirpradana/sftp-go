function validateUser(data) {
  const { username, password } = data;

  if (!username || !password) {
    return {
      isValid: false,
      message: "Username and password cannot be empty.",
    };
  }

  return {
    isValid: true,
    message: "Validation successful.",
  };
}

module.exports = { validateUser };
