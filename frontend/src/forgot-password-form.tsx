import "./style.css";

import React from "react";
import TextField from "material-ui/TextField";
import RaisedButton from "material-ui/RaisedButton";

export const ForgotPasswordForm = ({
  onSubmit,
  onChange,
  errors,
  forgotPassword,
}: any) => {
  
  return (
    <div className="loginBox">
      <h1>Forgot Password</h1>
      {errors.message && <p style={{ color: "red" }}>{errors.message}</p>}

      <form onSubmit={onSubmit}>
        <TextField
          name="email"
          floatingLabelText="e-mail"
          value={forgotPassword.email}
          onChange={onChange}
          errorText={errors.email}
        />

        <br />
        <RaisedButton
          buttonStyle={{
            backgroundColor: "#00ecbd",
            color: "#00ecbd",
          }}
          className="signUpSubmit"
          primary={true}
          type="submit"
          label="submit"
        />
      </form>
      <p>
        Aleady have an account? <br />
        <a href="/login">Log in here</a>
      </p>
    </div>
  );
};
