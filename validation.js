function validateUserCreate(data) {
  const { username, pbUserId } = data;

  if (!username) {
    return {
      isValid: false,
      message: "username is required!",
    };
  }

  if (!pbUserId) {
    return {
      isValid: false,
      message: "pbUserId is required!",
    };
  }

  return {
    isValid: true,
    message: "Validation successful.",
  };
}

export { validateUserCreate };
