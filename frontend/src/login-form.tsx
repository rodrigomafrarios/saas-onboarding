import "./style.css";

import React from "react";
import TextField from "material-ui/TextField";
import RaisedButton from "material-ui/RaisedButton";

export const LoginForm = ({
  onSubmit,
  onChange,
  errors,
  login,
  type,
  onPwChange
}: any) => {
  
  return (
    <div className="loginBox">
      <h1>Login</h1>
      
      {errors.message && <p style={{ color: "red" }}>{errors.message}</p>}     
      
      <form onSubmit={onSubmit}>
        <TextField
          name="email"
          floatingLabelText="e-mail"
          value={login.email}
          onChange={onChange}
          errorText={errors.email}
        />
        <TextField
          type="password"
          name="password"
          floatingLabelText="password"
          value={login.password}
          onChange={onPwChange}
          errorText={errors.password}
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
    </div>
  );
};
