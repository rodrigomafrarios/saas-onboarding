import validator from "validator";

export const validateSignUpForm = (payload: any) => {
  const errors: any = {};
  let message = "";
  let isFormValid = true;

  if (
    !payload ||
    typeof payload.givenName !== "string" ||
    payload.givenName.trim().length === 0
  ) {
    isFormValid = false;
    errors.givenName = "Please provide a given name.";
  }

  if (
    !payload ||
    typeof payload.familyName !== "string" ||
    payload.familyName.trim().length === 0
  ) {
    isFormValid = false;
    errors.familyName = "Please provide a family name.";
  }

  if (
    !payload ||
    typeof payload.invitee !== "string" ||
    !validator.isEmail(payload.invitee)
  ) {
    isFormValid = false;
    errors.invitee = "Please provide a correct email address.";
  }

  if (
    !payload ||
    typeof payload.hash !== "string" ||
    payload.hash.trim().length === 0
  ) {
    isFormValid = false;
    errors.hash = "Please provide a hash.";
  }

  if (!isFormValid) {
    message = "Check the form for errors.";
  }

  return {
    success: isFormValid,
    message,
    errors
  };
};

export const validateForgotPasswordForm = (payload: any) => {
  const errors: any = {};
  let message = "";
  let isFormValid = true;

  if (!isFormValid) {
    message = "Check the form for errors.";
  }

  if (
    !payload ||
    typeof payload.email !== "string" ||
    !validator.isEmail(payload.email)
  ) {
    isFormValid = false;
    errors.email = "Please provide a correct email address.";
  }

  return {
    success: isFormValid,
    message,
    errors
  };
}

export const validateResetPasswordForm = (payload: any) => {
  const errors: any = {};
  let message = "";
  let isFormValid = true;

  if (
    !payload ||
    typeof payload.newPassword !== "string" ||
    payload.newPassword.trim().length < 8
  ) {
    isFormValid = false;
    errors.newPassword = "Password must have at least 8 characters.";
  }

  if (!payload || payload.pwconfirm !== payload.password) {
    isFormValid = false;
    errors.pwconfirm = "Password confirmation doesn't match.";
  }

  if (
    !payload ||
    typeof payload.hash !== "string" ||
    payload.hash.trim().length === 0
  ) {
    isFormValid = false;
    errors.hash = "Please provide a hash.";
  }

  if (!isFormValid) {
    message = "Check the form for errors.";
  }

  return {
    success: isFormValid,
    message,
    errors
  };
}

export const validateTenantRegistrationForm = (payload: any) => {
  const errors: any = {};
  let message = "";
  let isFormValid = true;

  if (!isFormValid) {
    message = "Check the form for errors.";
  }

  if (
    !payload ||
    typeof payload.subDomain !== "string" ||
    payload.subDomain.trim().length === 0
  ) {
    isFormValid = false;
    errors.subDomain = "Please provide a Sub domain.";
  }

  if (
    !payload ||
    typeof payload.adminEmail !== "string" ||
    !validator.isEmail(payload.adminEmail)
  ) {
    isFormValid = false;
    errors.adminEmail = "Please provide a correct email address.";
  }

  if (
    !payload ||
    typeof payload.name !== "string" ||
    payload.name.trim().length === 0
  ) {
    isFormValid = false;
    errors.name = "Please provide a Company Name.";
  }

  if (
    !payload ||
    typeof payload.tier !== "string" ||
    payload.tier.trim().length === 0
  ) {
    isFormValid = false;
    errors.tier = "Please provide a tier.";
  }

  return {
    success: isFormValid,
    message,
    errors
  };
}

export const validateLoginForm = (payload: any) => {
  const errors: any = {};
  let message = "";
  let isFormValid = true;

  if (
    !payload ||
    typeof payload.email !== "string" ||
    !validator.isEmail(payload.email)
  ) {
    isFormValid = false;
    errors.email = "Please provide a correct email address.";
  }

  if (
    !payload ||
    typeof payload.password !== "string" ||
    payload.password.trim().length === 0
  ) {
    isFormValid = false;
    errors.password = "Please provide your password.";
  }

  if (!isFormValid) {
    message = "Check the form for errors.";
  }

  return {
    success: isFormValid,
    message,
    errors
  };
};
