import "./style.css";

import React from "react";
import TextField from "material-ui/TextField";
import RaisedButton from "material-ui/RaisedButton";

export const SignUpForm = ({
  onSubmit,
  onChange,
  errors,
  user,
}: any) => {
  
  return (
    <div className="loginBox">
      <h1>User registration</h1>
      {errors.message && <p style={{ color: "red" }}>{errors.message}</p>}

      <form onSubmit={onSubmit}>
        <TextField
          name="givenName"
          floatingLabelText="given name"
          value={user.givenName}
          onChange={onChange}
          errorText={errors.givenName}
        />
        <TextField
          name="familyName"
          floatingLabelText="family name"
          value={user.familyName}
          onChange={onChange}
          errorText={errors.username}
        />
        <TextField
          name="invitee"
          floatingLabelText="e-mail"
          value={user.invitee}
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
